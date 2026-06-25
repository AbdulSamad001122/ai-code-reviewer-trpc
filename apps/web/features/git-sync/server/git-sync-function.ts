import { inngest } from "@/features/inngest/client";
import { syncFeatureToGit, commitMultipleFiles } from "./git-sync";
import { getGithubApp } from "@/features/github/utils/github-app";
import { prisma } from "@/lib/db";

export const syncFeatureGitFunction = inngest.createFunction(
  {
    id: "sync-feature-git",
    triggers: { event: "app/git_sync.requested" },
  },
  async ({ event, step }) => {
    const { featureId } = event.data;

    await step.run("sync-feature-to-github", async () => {
      await syncFeatureToGit(featureId);
    });

    return { success: true, featureId };
  }
);

export const deleteFeatureGitFunction = inngest.createFunction(
  {
    id: "delete-feature-git",
    triggers: { event: "app/feature.deleted" },
  },
  async ({ event, step }) => {
    const { slug, repoFullName, branch, installationId, title } = event.data;

    await step.run("delete-feature-from-github", async () => {
      const app = getGithubApp();
      const octokit = await app.getInstallationOctokit(installationId);
      const [owner, repo] = repoFullName.split("/");

      try {
        const featurePath = `.shipflow/features/${slug}`;
        const { data: treeData } = await octokit.request(
          "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
          { owner, repo, tree_sha: branch, recursive: "1" }
        );
        
        const filesToDelete: { path: string; content: null }[] = [];
        treeData.tree.forEach(entry => {
          if (entry.path && entry.path.startsWith(featurePath) && entry.type === "blob") {
            filesToDelete.push({
              path: entry.path,
              content: null // marks for deletion
            });
          }
        });

        if (filesToDelete.length > 0) {
          await commitMultipleFiles(
            installationId,
            repoFullName,
            branch,
            filesToDelete,
            `docs(shipflow): delete feature "${title}" specifications [skip ci]`
          );
        }
      } catch (err) {
        console.error("[deleteFeatureGitFunction] Failed to delete files from GitHub:", err);
      }
    });

    return { success: true, slug };
  }
);

export const syncGithubPushToKanbanFunction = inngest.createFunction(
  {
    id: "sync-github-push-to-kanban",
    triggers: { event: "github/push.received" },
  },
  async ({ event, step }) => {
    const { installationId, repoFullName, branch } = event.data;
    const [owner, repo] = repoFullName.split("/");

    const taskUpdates = await step.run("fetch-and-parse-tasks-from-github", async () => {
      const app = getGithubApp();
      const octokit = await app.getInstallationOctokit(installationId);

      // 1. Get the repository tree
      const { data: treeData } = await octokit.request(
        "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
        { owner, repo, tree_sha: branch, recursive: "1" }
      );

      // 2. Find all tasks.md files under .shipflow/features/
      const tasksFiles = treeData.tree.filter(entry => 
        entry.path && 
        entry.path.startsWith(".shipflow/features/") && 
        entry.path.endsWith("/tasks.md")
      );

      const updates: { taskId: string; isChecked: boolean }[] = [];

      // 3. Fetch each tasks.md and parse checkboxes
      for (const file of tasksFiles) {
        if (!file.path) continue;
        const { data: contentData } = await octokit.request(
          "GET /repos/{owner}/{repo}/contents/{path}",
          { owner, repo, path: file.path, ref: branch }
        );

        if ("content" in contentData) {
          const content = Buffer.from(contentData.content, "base64").toString("utf-8");
          const regex = /-\s*\[([ xX])\]\s*\*\*(.*?)\*\*\s*\(id:\s*([a-zA-Z0-9_-]+)\)/g;
          let match;
          while ((match = regex.exec(content)) !== null) {
            const isChecked = match[1].toLowerCase() === "x";
            const taskId = match[3];
            updates.push({ taskId, isChecked });
          }
        }
      }

      return updates;
    });

    // 4. Update task statuses in db
    await step.run("update-tasks-in-db", async () => {
      for (const update of taskUpdates) {
        const targetStatus = update.isChecked ? "done" : "todo";
        const task = await prisma.task.findUnique({
          where: { id: update.taskId }
        });

        if (task && task.status !== targetStatus) {
          await prisma.task.update({
            where: { id: update.taskId },
            data: { status: targetStatus }
          });
        }
      }
    });

    return { processedCount: taskUpdates.length };
  }
);

export const deleteProjectGitFunction = inngest.createFunction(
  {
    id: "delete-project-git",
    triggers: { event: "app/project.deleted" },
  },
  async ({ event, step }) => {
    const { repoFullName, branch, installationId, name } = event.data;

    await step.run("delete-shipflow-folder-from-github", async () => {
      const app = getGithubApp();
      const octokit = await app.getInstallationOctokit(installationId);
      const [owner, repo] = repoFullName.split("/");

      try {
        const shipflowPath = ".shipflow";
        const { data: treeData } = await octokit.request(
          "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
          { owner, repo, tree_sha: branch, recursive: "1" }
        );
        
        const filesToDelete: { path: string; content: null }[] = [];
        treeData.tree.forEach(entry => {
          if (entry.path && entry.path.startsWith(shipflowPath) && entry.type === "blob") {
            filesToDelete.push({
              path: entry.path,
              content: null // marks for deletion
            });
          }
        });

        if (filesToDelete.length > 0) {
          await commitMultipleFiles(
            installationId,
            repoFullName,
            branch,
            filesToDelete,
            `docs(shipflow): delete project "${name}" shipflow specifications [skip ci]`
          );
        }
      } catch (err) {
        console.error("[deleteProjectGitFunction] Failed to delete .shipflow folder from GitHub:", err);
      }
    });

    return { success: true, repoFullName };
  }
);
