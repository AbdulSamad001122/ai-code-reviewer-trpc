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

async function generateJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const { text } = await generateText({
    model: openrouter(MODEL_NAME),
    system: systemPrompt,
    prompt: userPrompt,
  });

  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("No JSON object found in response");
    }
    const jsonStr = text.substring(start, end + 1);
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.error("Failed to parse AI response as JSON. Raw text was:", text);
    throw new Error(`AI generated invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Triggered on new feature request
export const onFeatureCreatedFunction = inngest.createFunction(
  {
    id: "on-feature-created",
    triggers: { event: "app/feature.created" },
  },
  async ({ event, step }) => {
    const { featureRequestId, projectId } = event.data;

    // Get feature details
    const featureRequest = await step.run("fetch-feature-details", async () => {
      const feat = await prisma.featureRequest.findUnique({
        where: { id: featureRequestId },
        include: { project: true },
      });
      if (!feat) throw new Error("Feature request not found");
      return feat;
    });

    // Check codebase for existing feature
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

    // Generate first question
    const firstQuestion = await step.run("generate-first-question", async () => {
      const systemPrompt = `You are an expert Product Manager. A user has submitted a feature request that is not yet in the codebase. Ask the first, highly targeted question to clarify missing requirements and details. Keep it conversational and friendly.
Ask for exactly 1-2 major clarifications only (e.g. key user options, integration targets).`;

      const userPrompt = `Feature Request: ${featureRequest.title}
Description: ${featureRequest.description}`;

      const { text } = await generateText({
        model: openrouter(MODEL_NAME),
        system: systemPrompt,
        prompt: userPrompt,
      });

      return text;
    });

    // Save question to chat
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

// Triggered on feature chat response
export const onFeatureChatReceivedFunction = inngest.createFunction(
  {
    id: "on-feature-chat-received",
    triggers: { event: "app/feature.chat_received" },
  },
  async ({ event, step }) => {
    const { featureRequestId } = event.data;

    // Get chat logs
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

    // Verify requirements
    const checkResult = await step.run("check-requirements-sufficiency", async () => {
      const systemPrompt = `You are a Senior Product Manager. Your task is to analyze a feature request and the requirements discussion history, and decide if you have enough clear, detailed information to compile a structured Product Requirements Document (PRD).
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
      // Ask next question
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

    // Update status to generating
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

    // Search codebase
    const codebaseSnippets = await step.run("search-codebase-for-prd", async () => {
      const repoNamespace = buildRepoNamespace(featureRequest.project.repoFullName);
      return searchPrContext(repoNamespace, `${featureRequest.title} ${featureRequest.description}`);
    });

    // Compile PRD
    const prdData = await step.run("compile-prd", async () => {
      const systemPrompt = `You are a Senior Product Manager. Your task is to generate a comprehensive Product Requirements Document (PRD) for the requested feature based on the requirements chat logs and the repository codebase context.
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

    // Save PRD
    const prd = await step.run("save-prd-and-advance", async () => {
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

    // Generate board tasks
    const tasks = await step.run("generate-engineering-tasks", async () => {
      const systemPrompt = `You are a Technical Lead. Your task is to break down a Product Requirements Document (PRD) into a list of actionable, technical engineering tasks.
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

      const { text } = await generateText({
        model: openrouter(MODEL_NAME),
        system: systemPrompt,
        prompt: userPrompt,
      });

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

    // Save engineering tasks
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

    return { status: "planning", reason: "PRD and tasks generated successfully" };
  }
);

