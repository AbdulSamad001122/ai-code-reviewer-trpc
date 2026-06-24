import { PullRequestWebhookPayload } from "@/features/github/server/webhook-handler";
import { prisma } from "@/lib/db";


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
  return matches >= 2 && matchRatio >= 0.6;
}

async function findMatchingFeatureRequest(
  repoFullName: string,
  branchName: string,
  prTitle: string,
  prBody: string | null
): Promise<string | null> {
  const activeFeatures = await prisma.featureRequest.findMany({
    where: {
      project: { repoFullName },
      status: { in: ["development", "planning", "ready_for_review"] },
    },
  });

  if (activeFeatures.length === 0) {
    return null;
  }

  const normalizedBranch = branchName.toLowerCase();
  const normalizedTitle = prTitle.toLowerCase();
  const normalizedBody = prBody ? prBody.toLowerCase() : "";

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

  for (const feature of activeFeatures) {
    const featureSlug = slugify(feature.title);
    if (featureSlug && (normalizedBranch.includes(featureSlug) || normalizedTitle.includes(featureSlug))) {
      return feature.id;
    }
  }

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

  const devFeatures = activeFeatures.filter((f) => f.status === "development");
  if (devFeatures.length === 1) {
    return devFeatures[0].id;
  }

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

  const featureRequestId = await findMatchingFeatureRequest(
    repoFullName,
    branchName,
    prTitle,
    prBody
  );

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
      featureRequestId: featureRequestId ?? null,
    },
    update: {
      title: prTitle,
      headSha: payload.pull_request.head.sha,
      status: "pending",
      featureRequestId: featureRequestId ?? null,
    }
  });
}