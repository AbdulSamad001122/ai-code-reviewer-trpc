import { getGithubApp } from "@/features/github/utils/github-app";
import { prisma } from "@/lib/db";

// Helper to generate a slug from text
export function getSlug(title: string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  if (baseSlug.length > 50) {
    return baseSlug.slice(0, 50).replace(/-$/, "");
  }
  return baseSlug;
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
    content: `# 🚢 TheShip AI Developer Protocol

This repository is managed by **TheShip**. Follow this protocol to align your development with the active product specifications.

## ⚠️ READ-ONLY CONSTRAINTS
- **DO NOT** write, modify, delete, or overwrite any files in the \`.theship/\` directory (except checkboxes inside \`tasks.md\`).
- This folder acts as your **read-only source of truth** representing the PM directives and PRD.

## 📋 SYSTEMATIC WORKFLOW
1. **Fetch Latest Spec**: Sync the configuration files without changing your branch code:
   \`\`\`bash
   git fetch origin && git checkout origin/${branch} -- .theship
   \`\`\`
2. **Understand the PRD**: Read \`.theship/features/${slug}/01_PRD.md\`.
3. **Execute Linearly**: Read \`.theship/features/${slug}/02_TASKS.json\` and follow the individual task instructions under \`.theship/features/${slug}/tasks/\` in strict sequential order.
4. **Inspect Reviews**: Check \`.theship/features/${slug}/review.md\` to fix any blocking comments raised in previous PR reviews.
5. **Update Kanban**: Mark task progress in \`.theship/features/${slug}/tasks.md\` using:
   - \`[ ]\` - Todo
   - \`[/]\` - In Progress
   - \`[-]\` - In Review
   - \`[x]\` - Done
   Commit and push your changes to synchronize status.
`
  });

  files.push({
    path: ".cursorrules",
    content: `# TheShip System Rules for AI IDE (Cursor)

You are an AI coding assistant acting as a developer inside this workspace.

## ⚠️ CRITICAL RULES
1. **Read-Only Directory**: The \`.theship/\` directory is **read-only**. You MUST NOT delete, modify, or overwrite any PRD, guide, task data, or review files (except checking off task boxes inside \`tasks.md\`).
2. **Single Source of Truth**: Treat \`.theship/features/${slug}/01_PRD.md\` as the absolute source of truth. Do not invent requirements outside of it.
3. **Strict Task Sequence**: Implement tasks in the exact order listed in \`02_TASKS.json\`. Read the corresponding detail file \`tasks/{index}-{task_slug}.md\` for each task.

## 🛠️ WORKFLOW FOR ACTIVE WORK
- **Fetch Specs**: Run \`git fetch origin && git checkout origin/${branch} -- .theship\` to fetch updates.
- **Review Feedback**: Always check if \`review.md\` exists. If there is a review file with \`REQUEST CHANGES\` or \`[BLOCKING]\` issues, prioritize fixing them before starting new tasks.
- **Progress Tracking**: Update status in \`tasks.md\` by changing checkboxes:
  - \`[ ]\` -> \`[/]\` when starting a task.
  - \`[/]\` -> \`[x]\` when the task is verified and complete.
  Commit and push to sync.
`
  });

  files.push({
    path: "CLAUDE.md",
    content: `# CLAUDE.md - TheShip System Rules for Claude Code

This project uses TheShip for tracking specifications and engineering tasks.

## ⚠️ CRITICAL RULES
1. **Read-Only Directory**: The \`.theship/\` directory is **read-only**. You MUST NOT delete, modify, or overwrite any PRD, guide, task data, or review files (except checking off task boxes inside \`tasks.md\`).
2. **Single Source of Truth**: Treat \`.theship/features/${slug}/01_PRD.md\` as the absolute source of truth. Do not invent requirements outside of it.
3. **Strict Task Sequence**: Implement tasks in the exact order listed in \`02_TASKS.json\`. Read the corresponding detail file \`tasks/{index}-{task_slug}.md\` for each task.

## 🛠️ WORKFLOW FOR ACTIVE WORK
- **Fetch Specs**: Run \`git fetch origin && git checkout origin/${branch} -- .theship\` to fetch updates.
- **Review Feedback**: Always check if \`review.md\` exists. If there is a review file with \`REQUEST CHANGES\` or \`[BLOCKING]\` issues, prioritize fixing them before starting new tasks.
- **Progress Tracking**: Update status in \`tasks.md\` by changing checkboxes:
  - \`[ ]\` -> \`[/]\` when starting a task.
  - \`[/]\` -> \`[x]\` when the task is verified and complete.
  Commit and push to sync.
`
  });

  files.push({
    path: ".theship/README.md",
    content: `# TheShip AI Workspace\n\nThis directory contains specifications, task boards, and reviews synced from your TheShip board.\n\n## ⚠️ Read-Only Directory\nDO NOT delete, modify, or overwrite any files in this directory (except checking checkboxes inside \`tasks.md\`).\n\n## Folder Structure\n* \`llms.txt\` - Configuration guide for local AI code assistants (Cursor, Claude Code).\n* \`features/\` - Subfolders containing active features.\n  * \`{feature-title}/01_PRD.md\` - Product requirements and acceptance criteria.\n  * \`{feature-title}/02_TASKS.json\` - JSON data representing active tasks.\n  * \`{feature-title}/review.md\` - Latest code review feedback logs.\n  * \`{feature-title}/guide.md\` - Implementation details and guides.\n  * \`{feature-title}/tasks.md\` - Main engineering task list and checkbox sync.\n  * \`{feature-title}/tasks/\` - Detailed step-by-step documentation for each individual task.\n`
  });

  files.push({
    path: ".theship/llms.txt",
    content: `# TheShip System Rules for LLM/IDE Assistants\n\n## ⚠️ CRITICAL RULES\n1. **Read-Only Directory**: The \`.theship/\` directory is **read-only**. You MUST NOT delete, modify, or overwrite any PRD, guide, task data, or review files (except checking off task boxes inside \`tasks.md\`).\n2. **Single Source of Truth**: Treat \`.theship/features/${slug}/01_PRD.md\` as the absolute source of truth. Do not invent requirements outside of it.\n3. **Strict Task Sequence**: Implement tasks in the exact order listed in \`02_TASKS.json\`. Read the corresponding detail file \`tasks/{index}-{task_slug}.md\` for each task.\n\n## 🛠️ WORKFLOW FOR ACTIVE WORK\n- **Fetch Specs**: Run \`git fetch origin && git checkout origin/${branch} -- .theship\` to fetch updates.\n- **Review Feedback**: Always check if \`review.md\` exists. If there is a review file with \`REQUEST CHANGES\` or \`[BLOCKING]\` issues, prioritize fixing them before starting new tasks.\n- **Progress Tracking**: Update status in \`tasks.md\` by changing checkboxes:\n  - \`[ ]\` -> \`[/]\` when starting a task.\n  - \`[/]\` -> \`[x]\` when the task is verified and complete.\n  Commit and push to sync.\n`
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

  // 3b. Fetch latest review if exists
  const latestPr = await prisma.pullRequest.findFirst({
    where: {
      featureRequestId: featureId,
      status: { in: ["reviewed", "fix_needed"] },
      reviewComment: { not: null }
    },
    orderBy: { updatedAt: "desc" }
  });

  if (latestPr && latestPr.reviewComment) {
    files.push({
      path: `.theship/features/${slug}/review.md`,
      content: latestPr.reviewComment
    });
  }

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

  // 5. Cleanup deleted subtasks and stale files on GitHub using path sets
  try {
    const app = getGithubApp();
    const octokit = await app.getInstallationOctokit(installationId);
    
    // Get the current feature folder tree to find files that should be deleted
    const featurePath = `.theship/features/${slug}`;
    const { data: treeData } = await octokit.request(
      "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
      { owner, repo, tree_sha: branch, recursive: "1" }
    );
    
    const activePaths = new Set(files.map(f => f.path));
    
    treeData.tree.forEach(entry => {
      if (entry.path && entry.path.startsWith(featurePath) && entry.type === "blob") {
        if (!activePaths.has(entry.path)) {
          // This file is no longer in our active list, delete it from GitHub!
          files.push({
            path: entry.path,
            content: null // marks for deletion
          });
        }
      }
    });
  } catch (err) {
    // If the folder/tree doesn't exist yet, we just ignore the error
    console.log("[syncFeatureToGit] No existing feature folder found to clean up.");
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
