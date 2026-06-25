import { getGithubApp } from "@/features/github/utils/github-app";
import { prisma } from "@/lib/db";

// Helper to generate a slug from text
export function getSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// Fetch GitHub installation ID for a project
export async function getInstallationIdForProject(projectId: string): Promise<number> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      workspace: {
        include: {
          members: {
            where: { role: "owner" },
            include: { user: { include: { githubInstallation: true } } }
          }
        }
      }
    }
  });

  if (project?.workspace?.members[0]?.user?.githubInstallation?.installationId) {
    return project.workspace.members[0].user.githubInstallation.installationId;
  }

  // Fallback to RepoSync mapping
  const repoSync = await prisma.repoSync.findUnique({
    where: { repoFullName: project?.repoFullName ?? "" }
  });

  if (repoSync?.installationId) {
    return repoSync.installationId;
  }

  throw new Error("Could not find GitHub installation for project: " + projectId);
}

// Commit multiple files atomically using Git Data API
export async function commitMultipleFiles(
  installationId: number,
  repoFullName: string,
  branch: string,
  files: { path: string; content: string | null }[],
  message: string
) {
  const app = getGithubApp();
  const octokit = await app.getInstallationOctokit(installationId);
  const [owner, repo] = repoFullName.split("/");

  // 1. Get reference to default branch (or project branch)
  const { data: refData } = await octokit.request(
    "GET /repos/{owner}/{repo}/git/ref/heads/{ref}",
    { owner, repo, ref: branch }
  );
  const latestCommitSha = refData.object.sha;

  // 2. Get the tree of that latest commit
  const { data: commitData } = await octokit.request(
    "GET /repos/{owner}/{repo}/git/commits/{commit_sha}",
    { owner, repo, commit_sha: latestCommitSha }
  );
  const baseTreeSha = commitData.tree.sha;

  // 3. Create tree entries
  const treeEntries = files.map(file => {
    if (file.content === null) {
      // Deletion entry
      return {
        path: file.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: null
      };
    }
    return {
      path: file.path,
      mode: "100644" as const,
      type: "blob" as const,
      content: file.content
    };
  });

  // 4. Create new tree
  const { data: treeData } = await octokit.request(
    "POST /repos/{owner}/{repo}/git/trees",
    {
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: treeEntries
    }
  );
  const newTreeSha = treeData.sha;

  // 5. Create new commit
  const { data: newCommitData } = await octokit.request(
    "POST /repos/{owner}/{repo}/git/commits",
    {
      owner,
      repo,
      message,
      tree: newTreeSha,
      parents: [latestCommitSha]
    }
  );
  const newCommitSha = newCommitData.sha;

  // 6. Update reference
  await octokit.request(
    "PATCH /repos/{owner}/{repo}/git/refs/{ref}",
    {
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommitSha,
      force: false
    }
  );

  return newCommitSha;
}

// Sync full feature folder and tasks checklists to GitHub
export async function syncFeatureToGit(featureId: string) {
  const feature = await prisma.featureRequest.findUnique({
    where: { id: featureId },
    include: {
      prd: { include: { tasks: true } },
      project: true
    }
  });

  if (!feature || !feature.prd) return;

  const slug = getSlug(feature.title);
  const installationId = await getInstallationIdForProject(feature.projectId);
  const branch = feature.project.branch;
  const [owner, repo] = feature.project.repoFullName.split("/");

  const files: { path: string; content: string | null }[] = [];

  // 1. Root configuration & instruction files to guide local AI/IDE agents
  files.push({
    path: ".theship/AI_PRIORITY.flag",
    content: JSON.stringify({ system: "theship", priority: "high" }, null, 2)
  });

  files.push({
    path: ".theship/00_START_HERE.md",
    content: `This project uses TheShip.

Step 1: Read 01_PRD.md  
Step 2: Read 02_TASKS.json  
Step 3: Follow tasks in order  
Step 4: Never assume requirements outside TheShip folder
`
  });

  files.push({
    path: ".cursorrules",
    content: `# TheShip Cursor Rules

This project uses TheShip for task management and specifications.

## ⚠️ CRITICAL INSTRUCTION
Before executing any task or writing any code, you MUST:
1. Run \`git pull\` to fetch the latest specifications and tasks from the \`.theship\` directory.
2. Read the global guidelines in \`.theship/00_START_HERE.md\`.
3. Read the active feature requirements in \`.theship/features/{feature}/01_PRD.md\` (and \`prd.md\`).
4. Refer to the task specifications in \`.theship/features/{feature}/02_TASKS.json\` and the detailed task files under \`.theship/features/{feature}/tasks/\`.
5. Never assume requirements outside the \`.theship\` directory.
6. After completing a task, check it off in \`.theship/features/{feature}/tasks.md\` by changing the checkbox (e.g. \`[ ]\` to \`[x]\` or \`[/]\`), commit, and push.
`
  });

  files.push({
    path: "CLAUDE.md",
    content: `# CLAUDE.md - TheShip Guidelines

This project uses TheShip for tracking specifications and engineering tasks.

## ⚠️ CRITICAL INSTRUCTION
Before starting work:
1. Run \`git pull\` to fetch the latest \`.theship\` updates.
2. Read \`.theship/00_START_HERE.md\` and \`.theship/AI_PRIORITY.flag\`.
3. Review the active feature requirements in \`.theship/features/{feature}/01_PRD.md\` and the tasks in \`.theship/features/{feature}/02_TASKS.json\`.
4. Follow tasks in order. Do not guess or assume requirements outside the \`.theship\` folder.
5. Mark completed tasks in \`.theship/features/{feature}/tasks.md\` and push your changes to trigger sync.
`
  });

  files.push({
    path: ".theship/README.md",
    content: `# TheShip AI Workspace\n\nThis directory contains specifications and tasks synced from your TheShip board.\n\n## Folder Structure\n* \`llms.txt\` - Configuration guide for local AI code assistants (Cursor, Claude Code).\n* \`features/\` - Subfolders containing active features.\n  * \`{feature-title}/01_PRD.md\` - Product requirements and acceptance criteria.\n  * \`{feature-title}/02_TASKS.json\` - JSON data representing active tasks.\n  * \`{feature-title}/guide.md\` - Implementation details and guides.\n  * \`{feature-title}/tasks.md\` - Main engineering task list and checkbox sync.\n  * \`{feature-title}/tasks/\` - Detailed step-by-step documentation for each individual task.\n`
  });

  files.push({
    path: ".theship/llms.txt",
    content: `# TheShip AI Workspace Guide\nThis directory contains the product specifications, architecture plans, and task lists compiled by TheShip AI.\n\n## Usage for IDE Agents (Cursor / Claude Code)\n1. Read the active feature specifications in \`.theship/features/{feature_name}/01_PRD.md\`.\n2. Check the active engineering tasks in \`.theship/features/{feature_name}/tasks.md\`.\n3. Refer to \`.theship/features/{feature_name}/tasks/{index}-{task_slug}.md\` for detailed coding instructions on each task.\n4. Update the tasks by marking checkboxes in the main \`tasks.md\` file (e.g. \`[ ]\` for Todo, \`[/]\` for In Progress, \`[-]\` for In Review, \`[x]\` for Done) as you write the code.\n5. Commit and push the changes to sync back to the TheShip board.\n`
  });

  // 2. Feature PRD and Guide
  const prdContent = feature.prd.rawContent || `# ${feature.title}\n\n${feature.prd.problemStatement}`;
  files.push({
    path: `.theship/features/${slug}/prd.md`,
    content: prdContent
  });
  files.push({
    path: `.theship/features/${slug}/01_PRD.md`,
    content: prdContent
  });

  const guideContent = `# Implementation Guide: ${feature.title}\n\n` +
    `## Problem Statement\n${feature.prd.problemStatement}\n\n` +
    `## Success Metrics\n${feature.prd.successMetrics.map(m => `- ${m}`).join("\n")}\n\n` +
    `## User Stories\n${feature.prd.userStories.map(s => `- ${s}`).join("\n")}\n`;
  files.push({
    path: `.theship/features/${slug}/guide.md`,
    content: guideContent
  });

  // 3. Main Tasks checklist file & JSON tasks representation
  let tasksListContent = `# Tasks for ${feature.title}\n\n`;
  feature.prd.tasks.forEach(task => {
    let box = " ";
    if (task.status === "done") {
      box = "x";
    } else if (task.status === "in_progress") {
      box = "/";
    } else if (task.status === "review") {
      box = "-";
    }
    tasksListContent += `- [${box}] **${task.title}** (id: ${task.id})\n`;
  });
  files.push({
    path: `.theship/features/${slug}/tasks.md`,
    content: tasksListContent
  });

  const tasksJsonContent = JSON.stringify(
    feature.prd.tasks.map((t, idx) => ({
      index: idx + 1,
      id: t.id,
      title: t.title,
      description: t.description || "",
      status: t.status
    })),
    null,
    2
  );
  files.push({
    path: `.theship/features/${slug}/02_TASKS.json`,
    content: tasksJsonContent
  });

  // 4. Individual Task files named by title slug
  feature.prd.tasks.forEach((task, index) => {
    const taskSlug = getSlug(task.title);
    const taskContent = `# Task: ${task.title}\n` +
      `**ID**: ${task.id}\n` +
      `**Status**: ${task.status.toUpperCase()}\n\n` +
      `## Description\n${task.description || "No description provided."}\n\n` +
      `## Instructions\n1. Review the requirements in ../01_PRD.md.\n2. Complete the code updates.\n3. Mark this task as done by checking it in ../tasks.md.\n`;
    files.push({
      path: `.theship/features/${slug}/tasks/${index + 1}-${taskSlug}.md`,
      content: taskContent
    });
  });

  // 5. Cleanup deleted subtasks on GitHub using path sets
  try {
    const app = getGithubApp();
    const octokit = await app.getInstallationOctokit(installationId);
    
    // Get the current tasks folder tree to find files that should be deleted
    const tasksPath = `.theship/features/${slug}/tasks`;
    const { data: treeData } = await octokit.request(
      "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
      { owner, repo, tree_sha: branch, recursive: "1" }
    );
    
    const activePaths = new Set(files.map(f => f.path));
    
    treeData.tree.forEach(entry => {
      if (entry.path && entry.path.startsWith(tasksPath) && entry.type === "blob") {
        if (!activePaths.has(entry.path)) {
          // This task file is no longer in our active list, delete it from GitHub!
          files.push({
            path: entry.path,
            content: null // marks for deletion
          });
        }
      }
    });
  } catch (err) {
    // If the folder/tree doesn't exist yet, we just ignore the error
    console.log("[syncFeatureToGit] No existing tasks folder found to clean up.");
  }

  // 6. Commit all changes
  try {
    await commitMultipleFiles(
      installationId,
      feature.project.repoFullName,
      branch,
      files,
      `docs(theship): sync feature "${feature.title}" specifications [skip ci]`
    );
  } catch (err: any) {
    console.error("[syncFeatureToGit] Failed to commit files to GitHub:", err);
    const isPermissionError = 
      err.status === 403 || 
      err.message?.includes("Resource not accessible by integration") ||
      err.message?.includes("integration") ||
      err.message?.includes("permission");
      
    if (isPermissionError) {
      await prisma.featureRequestChat.create({
        data: {
          featureRequestId: featureId,
          sender: "ai",
          message: `⚠️ **GitHub Sync Warning**: I couldn't write the \`.theship\` files to your repository.\n\n**Reason**: The GitHub App installation lacks write permissions.\n\n**Solution**: Please go to your GitHub App settings (or organization settings -> installed GitHub Apps) and ensure **"Contents: Read & Write"** permission is enabled. Once updated, synchronization will automatically resume on subsequent task updates.`
        }
      });
      return;
    }
    throw err;
  }
}

// Delete feature specifications folder from GitHub
export async function deleteFeatureFromGit(featureId: string) {
  const feature = await prisma.featureRequest.findUnique({
    where: { id: featureId },
    include: { project: true }
  });

  if (!feature) return;

  const slug = getSlug(feature.title);
  const installationId = await getInstallationIdForProject(feature.projectId);
  const branch = feature.project.branch;
  const [owner, repo] = feature.project.repoFullName.split("/");

  try {
    const app = getGithubApp();
    const octokit = await app.getInstallationOctokit(installationId);
    
    // Get the current tree to find all files under the feature path
    const featurePath = `.theship/features/${slug}`;
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
        feature.project.repoFullName,
        branch,
        filesToDelete,
        `docs(theship): delete feature "${feature.title}" specifications [skip ci]`
      );
    }
  } catch (err) {
    console.error("[deleteFeatureFromGit] Failed to delete files from GitHub:", err);
  }
}
