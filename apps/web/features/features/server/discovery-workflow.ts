import { inngest } from "@/features/inngest/client";
import { prisma } from "@/lib/db";
import { generateText } from "ai";
import { openrouter } from "@/features/ai";
import { getPineconeIndex } from "@/features/pinecone/client";
import { buildRepoNamespace } from "@/features/repo-sync/server/repo-sync";
import { searchPrContext } from "@/features/reviews/server/vector";

const MODEL_NAME = "openrouter/free";

type SufficiencyResponse = {
  sufficient: boolean;
  nextQuestion: string | null;
  reason: string;
};

type ExistsResponse = {
  exists: boolean;
  explanation: string;
};

type PrdResponse = {
  problemStatement: string;
  goals: string[];
  nonGoals: string[];
  userStories: string[];
  acceptanceCriteria: string[];
  edgeCases: string[];
  successMetrics: string[];
  markdown: string;
};

async function generateTextWithRetry(systemPrompt: string, userPrompt: string): Promise<string> {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { text } = await generateText({
      model: openrouter(MODEL_NAME),
      system: systemPrompt,
      prompt: userPrompt,
    });

    if (text.toLowerCase().includes("user safety")) {
      console.warn(`[generateTextWithRetry] Attempt ${attempt} returned a safety classification response ("${text.trim()}"). Retrying...`);
      if (attempt === maxRetries) {
        return text;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    return text;
  }
  throw new Error("Failed to generate text due to safety response limits.");
}

async function generateJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const text = await generateTextWithRetry(systemPrompt, userPrompt);

  try {
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "");
    }

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("No JSON object found in response");
    }
    const jsonStr = cleaned.substring(start, end + 1);
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.warn("Failed first pass of JSON parsing. Attempting heuristic repair. Raw text was:", text);
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]) as T;
      }
    } catch (nestedError) {
      console.error("Heuristic repair failed:", nestedError);
    }
    
    throw new Error(`AI generated invalid JSON: ${error instanceof Error ? error.message : String(error)}. Raw text: ${text}`);
  }
}

export const onFeatureCreatedFunction = inngest.createFunction(
  {
    id: "on-feature-created",
    triggers: { event: "app/feature.created" },
  },
  async ({ event, step }) => {
    const { featureRequestId, projectId } = event.data;

    const featureRequest = await step.run("fetch-feature-details", async () => {
      const feat = await prisma.featureRequest.findUnique({
        where: { id: featureRequestId },
        include: { project: true },
      });
      if (!feat) throw new Error("Feature request not found");
      return feat;
    });

    const codebaseSnippets = await step.run("search-codebase-vectors", async () => {
      const repoSync = await prisma.repoSync.findUnique({
        where: { repoFullName: featureRequest.project.repoFullName },
      });

      if (!repoSync || repoSync.status !== "synced") {
        return [];
      }

      const repoNamespace = buildRepoNamespace(featureRequest.project.repoFullName);
      return searchPrContext(repoNamespace, `${featureRequest.title} ${featureRequest.description}`);
    });

    let featureExists = false;
    let existsExplanation = "";

    if (codebaseSnippets.length > 0) {
      const result = await step.run("check-feature-existence", async () => {
        const systemPrompt = `You are a Staff Software Engineer. Analyze the user's requested feature and the codebase snippets retrieved from semantic search. Decide if this feature (or equivalent functionality) already exists in the codebase.
You must reply ONLY with a JSON object in this format:
{
  "exists": boolean,
  "explanation": string
}
Do not include any other text outside the JSON.`;

        const userPrompt = `Feature Request Title: ${featureRequest.title}
Description: ${featureRequest.description}

Codebase Context:
${codebaseSnippets.join("\n\n")}`;

        return generateJson<ExistsResponse>(systemPrompt, userPrompt);
      });

      featureExists = result.exists;
      existsExplanation = result.explanation;
    }

    if (featureExists) {
      await step.run("mark-as-shipped", async () => {
        await prisma.featureRequestChat.create({
          data: {
            featureRequestId,
            sender: "ai",
            message: `I analyzed your repository codebase and found that this feature (or equivalent functionality) already exists!\n\n**Reasoning:**\n${existsExplanation}\n\nSince it's already built, I have marked this request as "Shipped".`,
          },
        });

        await prisma.featureRequest.update({
          where: { id: featureRequestId },
          data: { status: "shipped" },
        });
      });

      return { status: "shipped", reason: "Feature already exists in codebase" };
    }

    const firstQuestion = await step.run("generate-first-question", async () => {
      const systemPrompt = `You are an expert Product Manager. A user has submitted a feature request that is not yet in the codebase. Ask the first, highly targeted question to clarify missing requirements and details. Keep it conversational and friendly.
Ask for exactly 1-2 major clarifications only (e.g. key user options, integration targets).`;

      const userPrompt = `Feature Request: ${featureRequest.title}
Description: ${featureRequest.description}`;

      const text = await generateTextWithRetry(systemPrompt, userPrompt);
      return text;
    });

    await step.run("save-first-question", async () => {
      await prisma.featureRequestChat.create({
        data: {
          featureRequestId,
          sender: "ai",
          message: firstQuestion,
        },
      });
    });

    return { status: "discovery", reason: "Sent first clarification question" };
  }
);

export const onFeatureChatReceivedFunction = inngest.createFunction(
  {
    id: "on-feature-chat-received",
    triggers: { event: "app/feature.chat_received" },
  },
  async ({ event, step }) => {
    const { featureRequestId } = event.data;

    const { featureRequest, chatLogs } = await step.run("fetch-chat-context", async () => {
      const feat = await prisma.featureRequest.findUnique({
        where: { id: featureRequestId },
        include: { project: true },
      });
      if (!feat) throw new Error("Feature request not found");

      const chats = await prisma.featureRequestChat.findMany({
        where: { featureRequestId },
        orderBy: { createdAt: "asc" },
      });

      const formattedLogs = chats
        .map((chat) => `${chat.sender === "user" ? "User" : "AI PM"}: ${chat.message}`)
        .join("\n");

      return { featureRequest: feat, chatLogs: formattedLogs };
    });

    const checkResult = await step.run("check-requirements-sufficiency", async () => {
      const systemPrompt = `You are a Senior Product Manager. Your task is to analyze a feature request and the requirements discussion history, and decide if you have enough clear, detailed information to compile a structured Product Requirements Document (PRD).
* CRITICAL RULE: If the user explicitly chose to skip the entire chat, requests to proceed, or requests to compile the PRD now (e.g. text starts with "[Skip Question]" or "[Compile PRD Now]"), you MUST set "sufficient" to true immediately. Do not ask another question.
* CRITICAL RULE: If the user chose to skip a single question (e.g. text starts with "[Skip Single Question]"), do NOT mark requirements as sufficient immediately unless you have everything else you need. Instead:
  1. Respect the user's decision to skip that specific question (e.g., they don't want to provide sensitive credentials, API keys, or specific details).
  2. Make a reasonable, standard default assumption for that skipped requirement.
  3. Move on to check sufficiency of the remaining requirements or ask the next question.
  4. DO NOT ask the same question or repeat the topic of the skipped question.
* CRITICAL RULE: Under no circumstances should you repeat a question or ask about a topic that the user has already answered, dismissed, or skipped. If the user indicates they "already told you", "don't want to use it", or are dismissive, you must set "sufficient" to true or ask a completely different, unrelated question. Do not get stuck in a loop.
You must reply ONLY with a JSON object in this format:
{
  "sufficient": boolean,
  "nextQuestion": string | null,
  "reason": string
}
Do not include any other text outside the JSON.`;

      const userPrompt = `Original Request: ${featureRequest.title} - ${featureRequest.description}
Discussion History:
${chatLogs}

Does this give you enough detail to write the PRD? If not, what is the next single question you should ask?`;

      return generateJson<SufficiencyResponse>(systemPrompt, userPrompt);
    });

    if (!checkResult.sufficient) {
      const nextQuestion = checkResult.nextQuestion || "Can you clarify the primary user flows for this feature?";
      await step.run("save-next-question", async () => {
        await prisma.featureRequestChat.create({
          data: {
            featureRequestId,
            sender: "ai",
            message: nextQuestion,
          },
        });
      });

      return { status: "discovery", reason: "Asked next question" };
    }

    await step.run("update-status-generating", async () => {
      await prisma.featureRequest.update({
        where: { id: featureRequestId },
        data: { status: "prd_generation" },
      });

      await prisma.featureRequestChat.create({
        data: {
          featureRequestId,
          sender: "ai",
          message: "Great! I have all the details needed. I am compiling your structured Product Requirements Document (PRD) now...",
        },
      });
    });

    const codebaseSnippets = await step.run("search-codebase-for-prd", async () => {
      const repoNamespace = buildRepoNamespace(featureRequest.project.repoFullName);
      return searchPrContext(repoNamespace, `${featureRequest.title} ${featureRequest.description}`);
    });

    const prdData = await step.run("compile-prd", async () => {
      const systemPrompt = `You are a strict, professional Product Manager. Your task is to generate a comprehensive Product Requirements Document (PRD) for the requested feature based STRICTLY on the requirements chat logs and the repository codebase context.
CRITICAL INSTRUCTION: Do NOT invent, assume, or add any goals, requirements, integrations, user stories, or acceptance criteria that were not explicitly discussed, mentioned, or agreed upon in the chat logs. Stay 100% true only to the data gathered from the user. For example, do not add external database syncs, third-party auth, or CMS integrations unless the user explicitly requested them in the chat.
You must reply ONLY with a JSON object in this format:
{
  "problemStatement": string,
  "goals": string[],
  "nonGoals": string[],
  "userStories": string[],
  "acceptanceCriteria": string[],
  "edgeCases": string[],
  "successMetrics": string[],
  "markdown": string
}
In the "markdown" property, provide the full, beautifully styled PRD document in Github Markdown format. Do not include any other text outside the JSON.`;

      const userPrompt = `Feature Request Title: ${featureRequest.title}
Clarification Chat Logs:
${chatLogs}

Codebase Context:
${codebaseSnippets.join("\n\n")}`;

      return generateJson<PrdResponse>(systemPrompt, userPrompt);
    });

    const prd = await step.run("save-prd-and-advance", async () => {
      // Clean up any existing PRD and tasks to prevent duplicates or unique constraint failures on recreate
      const existingPrd = await prisma.pRD.findUnique({
        where: { featureRequestId }
      });
      if (existingPrd) {
        await prisma.task.deleteMany({
          where: { prdId: existingPrd.id }
        });
        await prisma.pRD.delete({
          where: { id: existingPrd.id }
        });
      }

      const prdObj = await prisma.pRD.create({
        data: {
          featureRequestId,
          problemStatement: prdData.problemStatement,
          goals: prdData.goals,
          nonGoals: prdData.nonGoals,
          userStories: prdData.userStories,
          acceptanceCriteria: prdData.acceptanceCriteria,
          edgeCases: prdData.edgeCases,
          successMetrics: prdData.successMetrics,
          rawContent: prdData.markdown,
        },
      });

      await prisma.featureRequest.update({
        where: { id: featureRequestId },
        data: { status: "planning" },
      });

      await prisma.featureRequestChat.create({
        data: {
          featureRequestId,
          sender: "ai",
          message: "PRD has been generated successfully! Head over to the PRD tab to review the specifications. I have also auto-generated engineering tasks on your Kanban board.",
        },
      });

      return prdObj;
    });

    const tasks = await step.run("generate-engineering-tasks", async () => {
      const systemPrompt = `You are a strict Technical Lead. Your task is to break down a Product Requirements Document (PRD) into a list of actionable, technical engineering tasks.
CRITICAL INSTRUCTION: Generate tasks ONLY for the features and requirements explicitly defined in the goals and acceptance criteria of this PRD. Do NOT invent or add any extra tasks, database schemas, integrations, or features (such as CMS fetching, analytics, or complex backend systems) unless they are directly specified in the PRD. Keep tasks simple and strictly aligned with the PRD.
You must reply ONLY with a JSON array in this format:
[
  {
    "title": "string",
    "description": "string"
  }
]
Do not include any other text outside the JSON array.`;

      const userPrompt = `Feature: ${featureRequest.title}
Problem Statement: ${prdData.problemStatement}
Goals: ${prdData.goals.join(", ")}
Acceptance Criteria:
${prdData.acceptanceCriteria.map((ac) => `- ${ac}`).join("\n")}

Break this down into 3-6 clear, actionable development tasks (e.g. backend api creation, frontend ui card implementation, integration steps).`;

      const text = await generateTextWithRetry(systemPrompt, userPrompt);

      try {
        const start = text.indexOf("[");
        const end = text.lastIndexOf("]");
        if (start === -1 || end === -1) {
          throw new Error("No JSON array found in response");
        }
        const jsonStr = text.substring(start, end + 1);
        return JSON.parse(jsonStr) as { title: string; description: string }[];
      } catch (error) {
        console.error("Failed to parse tasks list. Raw response was:", text);
        return [
          {
            title: `Implement ${featureRequest.title} Core Logic`,
            description: "Build the core components, schemas, and routes matching the PRD specification.",
          },
          {
            title: `Build Frontend Interface for ${featureRequest.title}`,
            description: "Implement user-facing views, forms, and validation states.",
          },
        ];
      }
    });

    await step.run("save-engineering-tasks", async () => {
      const tasksToCreate = tasks.map((task) => ({
        projectId: featureRequest.projectId,
        prdId: prd.id,
        title: task.title,
        description: task.description,
        status: "todo",
      }));

      for (const t of tasksToCreate) {
        await prisma.task.create({ data: t });
      }
    });

    await step.run("trigger-git-sync", async () => {
      await inngest.send({
        name: "app/git_sync.requested",
        data: { featureId: featureRequestId }
      });
    });

    return { status: "planning", reason: "PRD and tasks generated successfully" };
  }
);

export const onFeatureReleaseRejectedFunction = inngest.createFunction(
  {
    id: "on-feature-release-rejected",
    triggers: { event: "app/feature.release_rejected" },
  },
  async ({ event, step }) => {
    const { featureRequestId, reason } = event.data;

    const { featureRequest, prd } = await step.run("fetch-feature-and-prd", async () => {
      const feat = await prisma.featureRequest.findUnique({
        where: { id: featureRequestId },
        include: { prd: true },
      });
      if (!feat) throw new Error("Feature request not found");
      if (!feat.prd) throw new Error("PRD not found for this feature request");
      return { featureRequest: feat, prd: feat.prd };
    });

    const updatedPrdData = await step.run("revise-prd", async () => {
      const systemPrompt = `You are a Senior Product Manager. Your task is to revise an existing Product Requirements Document (PRD) to incorporate human rejection feedback.
You must reply ONLY with a JSON object in this format:
{
  "problemStatement": string,
  "goals": string[],
  "nonGoals": string[],
  "userStories": string[],
  "acceptanceCriteria": string[],
  "edgeCases": string[],
  "successMetrics": string[],
  "markdown": string
}
In the "markdown" property, provide the revised full PRD in Github Markdown format. Make sure the updates addressing the rejection reason are highlighted or documented. Do not include any other text outside the JSON.`;

      const userPrompt = `Rejection Feedback: ${reason}
      
Original PRD Details:
Problem Statement: ${prd.problemStatement}
Goals: ${prd.goals.join(", ")}
Acceptance Criteria:
${prd.acceptanceCriteria.map((ac) => `- ${ac}`).join("\n")}
Edge Cases:
${prd.edgeCases.map((ec) => `- ${ec}`).join("\n")}

Revise this PRD to address the rejection feedback.`;

      return generateJson<PrdResponse>(systemPrompt, userPrompt);
    });

    await step.run("update-prd-record", async () => {
      await prisma.pRD.update({
        where: { featureRequestId },
        data: {
          problemStatement: updatedPrdData.problemStatement,
          goals: updatedPrdData.goals,
          nonGoals: updatedPrdData.nonGoals,
          userStories: updatedPrdData.userStories,
          acceptanceCriteria: updatedPrdData.acceptanceCriteria,
          edgeCases: updatedPrdData.edgeCases,
          successMetrics: updatedPrdData.successMetrics,
          rawContent: updatedPrdData.markdown,
        },
      });
    });

    const newTasks = await step.run("generate-rejection-tasks", async () => {
      const systemPrompt = `You are a Technical Lead. A human reviewer has rejected a release. Based on their rejection feedback and the updated PRD goals/acceptance criteria, identify any NEW or MODIFIED technical tasks required to address the issues.
You must reply ONLY with a JSON array in this format:
[
  {
    "title": "string",
    "description": "string"
  }
]
Do not include any other text outside the JSON array.`;

      const userPrompt = `Rejection Feedback: ${reason}
      
Updated Goals: ${updatedPrdData.goals.join(", ")}
Updated Acceptance Criteria:
${updatedPrdData.acceptanceCriteria.map((ac) => `- ${ac}`).join("\n")}

Identify 1-3 new technical engineering tasks that the developers/agents must complete to address the rejection feedback.`;

      const text = await generateTextWithRetry(systemPrompt, userPrompt);

      try {
        const start = text.indexOf("[");
        const end = text.lastIndexOf("]");
        if (start === -1 || end === -1) {
          throw new Error("No JSON array found in response");
        }
        const jsonStr = text.substring(start, end + 1);
        return JSON.parse(jsonStr) as { title: string; description: string }[];
      } catch (error) {
        console.error("Failed to parse rejection tasks list. Raw response was:", text);
        return [
          {
            title: `Address Release Rejection: ${reason.substring(0, 40)}...`,
            description: `Implement code updates to resolve: ${reason}`,
          },
        ];
      }
    });

    await step.run("save-rejection-tasks", async () => {
      const tasksToCreate = newTasks.map((task) => ({
        projectId: featureRequest.projectId,
        prdId: prd.id,
        title: task.title,
        description: task.description,
        status: "todo",
      }));

      for (const t of tasksToCreate) {
        await prisma.task.create({ data: t });
      }
    });

    await step.run("trigger-git-sync", async () => {
      await inngest.send({
        name: "app/git_sync.requested",
        data: { featureId: featureRequestId }
      });
    });

    await step.run("advance-to-planning", async () => {
      await prisma.featureRequest.update({
        where: { id: featureRequestId },
        data: { status: "planning" },
      });

      const tasksListText = newTasks.map((t) => `- **${t.title}**`).join("\n");
      await prisma.featureRequestChat.create({
        data: {
          featureRequestId,
          sender: "ai",
          message: `🔄 **PRD Refined & Tasks Updated!**\n\nI have revised the Product Requirements Document (PRD) to address the feedback: *"${reason}"*.\n\nI have also added the following new tasks to your Kanban board:\n${tasksListText}\n\nThe feature is back in the **Planning** phase. Please review the updated board and click **Approve Plan & Start Development** when you are ready to implement the changes.`,
        },
      });
    });

    return { status: "planning", reason: "Refined PRD and generated new tasks" };
  }
);

export const onFeaturePrdUpdatedFunction = inngest.createFunction(
  {
    id: "on-feature-prd-updated",
    triggers: { event: "app/feature.prd_updated" },
  },
  async ({ event, step }) => {
    const { featureId, rawContent } = event.data;

    const featureRequest = await step.run("fetch-feature-details", async () => {
      const feat = await prisma.featureRequest.findUnique({
        where: { id: featureId },
        include: { prd: true },
      });
      if (!feat) throw new Error("Feature request not found");
      return feat;
    });

    const newTasks = await step.run("generate-tasks-from-edited-prd", async () => {
      const systemPrompt = `You are a strict Technical Lead. Your task is to break down a Product Requirements Document (PRD) into a list of actionable, technical engineering tasks.
CRITICAL INSTRUCTION: Generate tasks ONLY for the features and requirements explicitly defined in the goals and acceptance criteria of this PRD. Do NOT invent or add any extra tasks, database schemas, integrations, or features (such as CMS fetching, analytics, or complex backend systems) unless they are directly specified in the PRD. Keep tasks simple and strictly aligned with the PRD.
You must reply ONLY with a JSON array in this format:
[
  {
    "title": "string",
    "description": "string"
  }
]
Do not include any other text outside the JSON array.`;

      const userPrompt = `Feature Request: ${featureRequest.title}
PRD Markdown Content:
${rawContent}

Break this down into 3-6 clear, actionable development tasks.`;

      const text = await generateTextWithRetry(systemPrompt, userPrompt);

      try {
        const start = text.indexOf("[");
        const end = text.lastIndexOf("]");
        if (start === -1 || end === -1) {
          throw new Error("No JSON array found in response");
        }
        const jsonStr = text.substring(start, end + 1);
        return JSON.parse(jsonStr) as { title: string; description: string }[];
      } catch (error) {
        console.error("Failed to parse regenerated tasks list. Raw response was:", text);
        return [
          {
            title: `Implement ${featureRequest.title} Specifications`,
            description: "Complete all features and requirements defined in the updated PRD.",
          },
        ];
      }
    });

    await step.run("save-regenerated-tasks", async () => {
      if (featureRequest.prd) {
        // Delete old tasks linked to this PRD
        await prisma.task.deleteMany({
          where: { prdId: featureRequest.prd.id },
        });

        const tasksToCreate = newTasks.map((task) => ({
          projectId: featureRequest.projectId,
          prdId: featureRequest.prd!.id,
          title: task.title,
          description: task.description,
          status: "todo",
        }));

        for (const t of tasksToCreate) {
          await prisma.task.create({ data: t });
        }
      }
    });

    await step.run("trigger-git-sync", async () => {
      await inngest.send({
        name: "app/git_sync.requested",
        data: { featureId }
      });
    });

    await step.run("log-update-chat", async () => {
      const tasksListText = newTasks.map((t) => `- **${t.title}**`).join("\n");
      await prisma.featureRequestChat.create({
        data: {
          featureRequestId: featureId,
          sender: "ai",
          message: `🔄 **PRD Updated Manually & Tasks Regenerated!**\n\nThe specifications have been updated. I have regenerated the engineering tasks on your Kanban board:\n${tasksListText}\n\nI have also synced the updated PRD and tasks directly to the \`.theship/\` directory in your GitHub repository. The feature is in the **Planning** phase.`,
        },
      });
    });

    return { success: true, featureId };
  }
);
