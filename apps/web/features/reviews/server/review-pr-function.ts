import { inngest } from "@/features/inngest/client";
import { prisma } from "@/lib/db";
import { formatPrFilesForReview, getPullRequestFiles } from "./pr-files";
import { generateReview } from "./generate-review";
import { postPrComment } from "./post-pr-comment";
import { chunkPrFiles } from "../utils/chunk-code";
import { buildPrNamespace, saveChunksToPinecone, searchPrContext } from "./vector";
import { buildRepoNamespace } from "@/features/repo-sync/server/repo-sync";


export const reviewPullRequest = inngest.createFunction(
    { id: "review-pull-request", triggers: { event: "github/pr.received" } },
    async ({ event, step }) => {
      const pullRequestId = event.data.pullRequestId;
  
      const pullRequest = await step.run("mark-processing", async () => {
        return prisma.pullRequest.update({
          where: { id: pullRequestId },
          data: { status: "processing" },
        });
      });
  
      const chunks = await step.run("breakdown-code", async () => {
        const files = await getPullRequestFiles(
          pullRequest.installationId,
          pullRequest.repoFullName,
          pullRequest.prNumber
        );
  
        return chunkPrFiles(pullRequest.prNumber, files);
      });
  
      if (chunks.length === 0) {
        await step.run("mark-reviewed-no-code", async () => {
          await prisma.pullRequest.update({
            where: { id: pullRequestId },
            data: { status: "reviewed" },
          });
        });
  
        return { pullRequestId, status: "reviewed", reason: "no code to review" };
      }
  
      const namespace = buildPrNamespace(
        pullRequest.repoFullName,
        pullRequest.prNumber
      );
  
      await step.run("save-vectors-to-pinecone", async () => {
        await saveChunksToPinecone(namespace, chunks);
      });
  
      await step.sleep("wait-for-vectors-to-index", "10s");
  
      const repoContextSnippets = await step.run("search-repo-context", async () => {
        const repoSync = await prisma.repoSync.findUnique({
          where: { repoFullName: pullRequest.repoFullName },
        });
  
        if (!repoSync || repoSync.status !== "synced") {
          return [];
        }
  
        const repoNamespace = buildRepoNamespace(pullRequest.repoFullName);
        return searchPrContext(repoNamespace, pullRequest.title);
      });
  
      const prdContext = await step.run("fetch-prd-context", async () => {
        if (!pullRequest.featureRequestId) {
          return null;
        }

        const feature = await prisma.featureRequest.findUnique({
          where: { id: pullRequest.featureRequestId },
          include: {
            prd: true,
            project: {
              include: {
                tasks: true
              }
            }
          }
        });

        if (!feature || !feature.prd) {
          return null;
        }

        return {
          prd: {
            problemStatement: feature.prd.problemStatement,
            goals: feature.prd.goals,
            acceptanceCriteria: feature.prd.acceptanceCriteria,
          },
          tasks: feature.project.tasks.map(t => ({
            title: t.title,
            description: t.description,
            status: t.status,
          })),
        };
      });

      const review = await step.run("generate-ai-review", async () => {
        const contextSnippets = await searchPrContext(
          namespace,
          pullRequest.title
        );
  
        return generateReview({
          repoFullName: pullRequest.repoFullName,
          title: pullRequest.title,
          contextSnippets,
          repoContextSnippets,
          prd: prdContext?.prd ?? null,
          tasks: prdContext?.tasks ?? null,
        });
      });
  
      await step.run("post-pr-comment", async () => {
        await postPrComment(
          pullRequest.installationId,
          pullRequest.repoFullName,
          pullRequest.prNumber,
          review
        );
      });
  
      const resultStatus = await step.run("mark-reviewed", async () => {
        const isBlocking = review.includes("REQUEST CHANGES") || review.includes("[BLOCKING]");
        const prStatus = isBlocking ? "fix_needed" : "reviewed";

        await prisma.pullRequest.update({
          where: { id: pullRequestId },
          data: {
            status: prStatus,
            reviewComment: review,
            reviewedAt: new Date(),
          },
        });

        if (pullRequest.featureRequestId) {
          if (isBlocking) {
            await prisma.featureRequestChat.create({
              data: {
                featureRequestId: pullRequest.featureRequestId,
                sender: "ai",
                message: `I reviewed your pull request **#${pullRequest.prNumber}** and found some blocking issues. Please check the review comments on GitHub to resolve them. I've set the PR status to **Fix Needed**.`,
              },
            });
          } else {
            await prisma.featureRequest.update({
              where: { id: pullRequest.featureRequestId },
              data: { status: "ready_for_review" },
            });

            await prisma.featureRequestChat.create({
              data: {
                featureRequestId: pullRequest.featureRequestId,
                sender: "ai",
                message: `Great news! I reviewed pull request **#${pullRequest.prNumber}** and it successfully implements all PRD goals and acceptance criteria. The feature request is now **ready for review** and release approval!`,
              },
            });
          }
        }

        return prStatus;
      });
  
      return { pullRequestId, status: resultStatus };
    }
  );
  