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

      const limitCheck = await step.run("check-billing-limits", async () => {
        const project = pullRequest.featureRequestId
          ? await prisma.project.findFirst({
              where: { featureRequests: { some: { id: pullRequest.featureRequestId } } },
              include: {
                workspace: {
                  include: {
                    members: {
                      where: { role: "owner" },
                      include: { user: true },
                    },
                  },
                },
              },
            })
          : await prisma.project.findFirst({
              where: { repoFullName: pullRequest.repoFullName },
              include: {
                workspace: {
                  include: {
                    members: {
                      where: { role: "owner" },
                      include: { user: true },
                    },
                  },
                },
              },
            });

        if (!project || !project.workspace) {
          return { allowed: true, count: 0, maxReviews: 0, ownerId: "" };
        }

        const ownerMember = project.workspace.members[0];
        if (!ownerMember || !ownerMember.user) {
          return { allowed: true, count: 0, maxReviews: 0, ownerId: "" };
        }

        const owner = ownerMember.user;
        const isPaid = owner.subscriptionStatus === "active" || owner.subscriptionStatus === "trialing";
        const plan = isPaid ? owner.subscriptionPlan : "free";
        const count = owner.prReviewCount || 0;

        const maxReviews = plan === "unlimited" ? Infinity : (plan === "starter" ? 12 : 2);

        if (count >= maxReviews) {
          return { allowed: false, count, maxReviews, ownerId: owner.id };
        }

        await prisma.user.update({
          where: { id: owner.id },
          data: { prReviewCount: { increment: 1 } },
        });

        return { allowed: true, count: 0, maxReviews: 0, ownerId: "" };
      });

      if (!limitCheck.allowed) {
        await step.run("mark-rate-limited", async () => {
          await prisma.pullRequest.update({
            where: { id: pullRequestId },
            data: { status: "rate_limited" },
          });

          await postPrComment(
            pullRequest.installationId,
            pullRequest.repoFullName,
            pullRequest.prNumber,
            `⚠️ **PR Review Limit Reached**\n\nThe workspace owner has reached the PR review limit for their plan (${limitCheck.count}/${limitCheck.maxReviews} reviews analyzed).\n\nPlease upgrade the subscription in settings to continue analyzing Pull Requests.`
          );

          if (pullRequest.featureRequestId) {
            await prisma.featureRequestChat.create({
              data: {
                featureRequestId: pullRequest.featureRequestId,
                sender: "ai",
                message: `⚠️ **PR Review Limit Reached**: The workspace owner has reached the PR review limit for their plan (${limitCheck.count}/${limitCheck.maxReviews} reviews analyzed). Please upgrade the subscription in settings to analyze this PR.`,
              },
            });
          }
        });

        return { pullRequestId, status: "rate_limited", reason: "limit exceeded" };
      }
  
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
        if (pullRequest.featureRequestId) {
          const feature = await prisma.featureRequest.findUnique({
            where: { id: pullRequest.featureRequestId },
            include: {
              prd: {
                include: {
                  tasks: true
                }
              }
            }
          });

          if (feature && feature.prd) {
            return {
              isLinked: true,
              prd: {
                problemStatement: feature.prd.problemStatement,
                goals: feature.prd.goals,
                acceptanceCriteria: feature.prd.acceptanceCriteria,
              },
              tasks: feature.prd.tasks.map(t => ({
                id: t.id,
                title: t.title,
                description: t.description,
                status: t.status,
              })),
            };
          }
        }

        const project = await prisma.project.findFirst({
          where: { repoFullName: pullRequest.repoFullName },
        });

        if (project) {
          const activeFeature = await prisma.featureRequest.findFirst({
            where: {
              projectId: project.id,
              status: { in: ["development", "planning", "prd_generation", "ready_for_review"] },
            },
            include: {
              prd: {
                include: {
                  tasks: true
                }
              },
            },
            orderBy: { updatedAt: "desc" },
          });

          if (activeFeature && activeFeature.prd) {
            // Persist the link to the database
            await prisma.pullRequest.update({
              where: { id: pullRequestId },
              data: { featureRequestId: activeFeature.id }
            });

            return {
              isLinked: true,
              prd: {
                problemStatement: activeFeature.prd.problemStatement,
                goals: activeFeature.prd.goals,
                acceptanceCriteria: activeFeature.prd.acceptanceCriteria,
              },
              tasks: activeFeature.prd.tasks.map(t => ({
                id: t.id,
                title: t.title,
                description: t.description,
                status: t.status,
              })),
            };
          }
        }

        return null;
      });

      const files = await step.run("fetch-pr-files", async () => {
        return getPullRequestFiles(
          pullRequest.installationId,
          pullRequest.repoFullName,
          pullRequest.prNumber
        );
      });

      const review = await step.run("generate-ai-review", async () => {
        const contextSnippets = files.map((f) => {
          const patchContent = f.patch.length > 20000 ? f.patch.slice(0, 20000) + "\n... [TRUNCATED] ..." : f.patch;
          return `### File: ${f.filePath}\n\`\`\`diff\n${patchContent}\n\`\`\``;
        });
  
        return generateReview({
          repoFullName: pullRequest.repoFullName,
          title: pullRequest.title,
          isLinkedToFeature: prdContext?.isLinked ?? false,
          contextSnippets,
          repoContextSnippets,
          prd: prdContext?.prd ?? null,
          tasks: prdContext?.tasks ?? null,
        });
      });

      const { cleanReview, featureIdsToSync } = await step.run("parse-and-apply-task-updates", async () => {
        const match = review.match(/\[TASK_UPDATES\]([\s\S]*?)\[\/TASK_UPDATES\]/);
        const clean = review.replace(/\[TASK_UPDATES\][\s\S]*?\[\/TASK_UPDATES\]/, "").trim();
        const syncIds = new Set<string>();

        if (pullRequest.featureRequestId) {
          syncIds.add(pullRequest.featureRequestId);
        }
        
        if (match) {
          try {
            const updates = JSON.parse(match[1].trim());

            // Pre-fetch active feature tasks to map them correctly in case of local/production task ID mismatches
            let dbTasks: any[] = [];
            if (pullRequest.featureRequestId) {
              const feat = await prisma.featureRequest.findUnique({
                where: { id: pullRequest.featureRequestId },
                include: { prd: { include: { tasks: true } } }
              });
              if (feat?.prd?.tasks) {
                // Sort chronologically to match the ordered sequence of planned tasks
                dbTasks = feat.prd.tasks.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
              }
            }

            for (const [taskId, status] of Object.entries(updates)) {
              if (status === "in_progress" || status === "review" || status === "todo") {
                let targetTaskId = taskId;

                // 1. Try to locate the task by its ID
                let dbTask = dbTasks.find(t => t.id === targetTaskId);
                if (!dbTask) {
                  dbTask = await prisma.task.findUnique({
                    where: { id: targetTaskId }
                  });
                }

                // 2. Fallback: Map task update by chronological index if the ID from .theship (local DB) doesn't exist in the current DB (production)
                if (!dbTask && dbTasks.length > 0) {
                  const updatesKeys = Object.keys(updates);
                  const updateIdx = updatesKeys.indexOf(taskId);
                  if (updateIdx !== -1 && dbTasks[updateIdx]) {
                    dbTask = dbTasks[updateIdx];
                    targetTaskId = dbTask.id;
                  }
                }

                if (dbTask) {
                  const updatedTask = await prisma.task.update({
                    where: { id: targetTaskId },
                    data: { status },
                    include: {
                      prd: {
                        select: { featureRequestId: true }
                      }
                    }
                  });
                  if (updatedTask.prd?.featureRequestId) {
                    syncIds.add(updatedTask.prd.featureRequestId);
                  }
                }
              }
            }
          } catch (err) {
            console.error("Failed to parse task updates", err);
          }
        }
        return { cleanReview: clean, featureIdsToSync: Array.from(syncIds) };
      });

      if (featureIdsToSync && featureIdsToSync.length > 0) {
        await step.run("trigger-git-sync", async () => {
          for (const featureId of featureIdsToSync) {
            await inngest.send({
              name: "app/git_sync.requested",
              data: { featureId }
            });
          }
        });
      }
  
      await step.run("post-pr-comment", async () => {
        await postPrComment(
          pullRequest.installationId,
          pullRequest.repoFullName,
          pullRequest.prNumber,
          cleanReview
        );
      });
  
      const resultStatus = await step.run("mark-reviewed", async () => {
        const isBlocking = cleanReview.includes("REQUEST CHANGES") || cleanReview.includes("[BLOCKING]");
        const prStatus = isBlocking ? "fix_needed" : "reviewed";
 
        await prisma.pullRequest.update({
          where: { id: pullRequestId },
          data: {
            status: prStatus,
            reviewComment: cleanReview,
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
  