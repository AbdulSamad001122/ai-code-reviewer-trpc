import { PullRequestWebhookPayload } from "@/features/github/server/webhook-handler";
import { prisma } from "@/lib/db";
import { generateText } from "ai";
import { openrouter } from "@/features/ai";

const MODEL_NAME = process.env.AI_MODEL || "openrouter/free";


function getAuthorLogin(
    user: { login: string } | null
  ): string | null {
    if (!user) {
      return null;
    }
    return user.login;
  }
  

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getKeywords(title: string): string[] {
  const words = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .split(/[\s_-]+/)
    .filter((w) => w.length > 3);
  return Array.from(new Set(words));
}

function matchKeywords(featureKeywords: string[], targetText: string): boolean {
  if (featureKeywords.length === 0) return false;
  const targetLower = targetText.toLowerCase();
  
  let matches = 0;
  for (const keyword of featureKeywords) {
    if (targetLower.includes(keyword)) {
      matches++;
    }
  }
  
  const matchRatio = matches / featureKeywords.length;
  if (featureKeywords.length === 1) {
    return matches === 1;
  }
  return matches >= 2 || matchRatio >= 0.5;
}

async function findMatchingFeatureRequest(
  repoFullName: string,
  branchName: string,
  prTitle: string,
  prBody: string | null
): Promise<string | null> {
  const activeFeatures = await prisma.featureRequest.findMany({
    where: {
      project: {
        repoFullName: {
          equals: repoFullName,
          mode: "insensitive"
        }
      },
      status: { in: ["development", "planning", "ready_for_review"] },
    },
  });

  if (activeFeatures.length === 0) {
    return null;
  }

  const normalizedBranch = branchName.toLowerCase();
  const normalizedTitle = prTitle.toLowerCase();
  const normalizedBody = prBody ? prBody.toLowerCase() : "";

  // 1. Check direct feature ID match (e.g. branch name contains feature request cuid)
  for (const feature of activeFeatures) {
    const idLower = feature.id.toLowerCase();
    if (
      normalizedBranch.includes(idLower) ||
      normalizedTitle.includes(idLower) ||
      normalizedBody.includes(idLower)
    ) {
      return feature.id;
    }
  }

  // 2. Check exact slug match
  for (const feature of activeFeatures) {
    const featureSlug = slugify(feature.title);
    if (featureSlug && (normalizedBranch.includes(featureSlug) || normalizedTitle.includes(featureSlug))) {
      return feature.id;
    }
  }

  // 3. Check Task ID match (if developers include task IDs in their branch name or PR description)
  const words = [
    ...branchName.split(/[\s/_-]+/),
    ...prTitle.split(/[\s/_-]+/),
    ...(prBody ? prBody.split(/[\s/_-]+/) : [])
  ].filter(w => w.length >= 8); // CUIDs/IDs are usually at least 8 chars long

  if (words.length > 0) {
    const matchedTask = await prisma.task.findFirst({
      where: {
        id: { in: words },
        project: {
          repoFullName: {
            equals: repoFullName,
            mode: "insensitive"
          }
        }
      },
      select: { prd: { select: { featureRequestId: true } } }
    });
    if (matchedTask?.prd?.featureRequestId) {
      return matchedTask.prd.featureRequestId;
    }
  }

  // 4. Check keyword match (more robust for shorter titles now)
  for (const feature of activeFeatures) {
    const keywords = getKeywords(feature.title);
    if (
      matchKeywords(keywords, normalizedBranch) ||
      matchKeywords(keywords, normalizedTitle) ||
      matchKeywords(keywords, normalizedBody)
    ) {
      return feature.id;
    }
  }

  // 5. AI Semantic matching fallback (if we have multiple active features and simple keyword matches failed)
  if (activeFeatures.length > 1) {
    try {
      const featureOptions = activeFeatures.map(f => ({
        id: f.id,
        title: f.title,
        description: f.description
      }));

      const systemPrompt = `You are an AI engineering assistant. Your task is to match an incoming Pull Request to the most relevant Feature Request from a list of active features.
If none of the features match the intent of the Pull Request, you MUST return "null".
Only select a feature if there is a high-confidence match between the PR (title, branch, description) and the feature (title, description).
Return ONLY the exact selected feature ID, or the word "null" if no feature matches. Do not include any explanation or markdown formatting.`;

      const userPrompt = `Incoming Pull Request:
- Title: ${prTitle}
- Branch: ${branchName}
- Description: ${prBody ?? "No description"}

List of Active Features:
${featureOptions.map(f => `- [ID: ${f.id}] Title: "${f.title}" | Description: "${f.description}"`).join("\n")}

Respond with either the matching feature ID (e.g. "cm...") or "null":`;

      const { text } = await generateText({
        model: openrouter(MODEL_NAME),
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.1,
      });

      const result = text.trim();
      if (result && result !== "null" && featureOptions.some(f => f.id === result)) {
        console.log(`[findMatchingFeatureRequest] AI resolved PR match to feature ID: ${result}`);
        return result;
      }
    } catch (error) {
      console.error("[findMatchingFeatureRequest] AI semantic matching failed:", error);
    }
  }

  // 6. Fallback: single active "development" feature
  const devFeatures = activeFeatures.filter((f) => f.status === "development");
  if (devFeatures.length === 1) {
    return devFeatures[0].id;
  }

  // 7. Fallback: single active feature overall
  if (activeFeatures.length === 1) {
    return activeFeatures[0].id;
  }

  return null;
}

export async function savePullRequest(payload: PullRequestWebhookPayload) {
  const repoFullName = payload.repository.full_name;
  const prNumber = payload.pull_request.number;
  const branchName = payload.pull_request.head.ref;
  const prTitle = payload.pull_request.title;
  const prBody = payload.pull_request.body;

  const existingPr = await prisma.pullRequest.findUnique({
    where: {
      repoFullName_prNumber: { repoFullName, prNumber }
    },
    select: { featureRequestId: true }
  });

  let featureRequestId = existingPr?.featureRequestId || null;
  if (!featureRequestId) {
    featureRequestId = await findMatchingFeatureRequest(
      repoFullName,
      branchName,
      prTitle,
      prBody
    );
  }

  return prisma.pullRequest.upsert({
    where: {
      repoFullName_prNumber: { repoFullName, prNumber }
    },
    create: {
      installationId: payload.installation.id,
      repoFullName,
      prNumber,
      title: prTitle,
      authorLogin: getAuthorLogin(payload.pull_request.user),
      headSha: payload.pull_request.head.sha,
      baseBranch: payload.pull_request.base.ref,
      status: "pending",
      featureRequestId,
    },
    update: {
      title: prTitle,
      headSha: payload.pull_request.head.sha,
      status: "pending",
      featureRequestId,
    }
  });
}