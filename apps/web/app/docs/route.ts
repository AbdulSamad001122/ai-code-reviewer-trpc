import { NextResponse } from "next/server";

export async function GET() {
  const openapiSpec = {
    openapi: "3.1.0",
    info: {
      title: "AI Code Reviewer API Reference",
      version: "1.0.0",
      description: "API Reference for the AI Code Reviewer Platform. Documents all core tRPC procedures and webhook integrations.",
    },
    servers: [
      {
        url: "/api",
        description: "Next.js API proxying endpoint (proxies to backend server)",
      },
    ],
    tags: [
      { name: "System", description: "Health checks and general configurations" },
      { name: "Workspaces", description: "Workspace and team membership management" },
      { name: "Projects", description: "Project creation, repository sync, and integrations" },
      { name: "Features", description: "AI PM chat discovery, specifications (PRDs), and feature release center" },
      { name: "Tasks", description: "Kanban board task tracking and development phase approvals" },
      { name: "Billing", description: "Lemon Squeezy checkout and subscription management" },
      { name: "Webhooks", description: "GitHub and Lemon Squeezy webhook integration routes" },
    ],
    paths: {
      "/trpc/health": {
        get: {
          tags: ["System"],
          summary: "Health Check",
          description: "Verify if the backend tRPC API service is online and running.",
          responses: {
            200: { description: "System is healthy." },
          },
        },
      },
      "/trpc/workspace.list": {
        get: {
          tags: ["Workspaces"],
          summary: "List Workspaces",
          description: "Retrieve all workspaces the authenticated user belongs to.",
          responses: {
            200: { description: "List of workspaces." },
          },
        },
      },
      "/trpc/workspace.create": {
        post: {
          tags: ["Workspaces"],
          summary: "Create Workspace",
          description: "Provision a new workspace.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string", example: "Engineering Team" },
                  },
                  required: ["name"],
                },
              },
            },
          },
          responses: {
            200: { description: "Workspace created successfully." },
          },
        },
      },
      "/trpc/workspace.getMembers": {
        get: {
          tags: ["Workspaces"],
          summary: "Get Workspace Members",
          description: "List all users who are members of the workspace and their roles.",
          parameters: [
            {
              name: "input",
              in: "query",
              required: true,
              description: "URL-encoded JSON input, e.g. `{\"workspaceId\":\"workspace-id\"}`",
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "List of workspace members." },
          },
        },
      },
      "/trpc/project.list": {
        get: {
          tags: ["Projects"],
          summary: "List Workspace Projects",
          description: "Retrieve linked repositories and projects within a workspace.",
          parameters: [
            {
              name: "input",
              in: "query",
              required: true,
              description: "URL-encoded JSON input, e.g. `{\"workspaceId\":\"workspace-id\"}`",
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "List of workspace projects." },
          },
        },
      },
      "/trpc/project.create": {
        post: {
          tags: ["Projects"],
          summary: "Link Project",
          description: "Import a GitHub repository into the workspace as a new project.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    workspaceId: { type: "string" },
                    name: { type: "string" },
                    description: { type: "string" },
                    repoFullName: { type: "string" },
                    branch: { type: "string", default: "main" },
                  },
                  required: ["workspaceId", "name", "repoFullName"],
                },
              },
            },
          },
          responses: {
            200: { description: "Project linked successfully." },
          },
        },
      },
      "/trpc/project.get": {
        get: {
          tags: ["Projects"],
          summary: "Get Project Details",
          description: "Fetch details of a single project by its ID.",
          parameters: [
            {
              name: "input",
              in: "query",
              required: true,
              description: "URL-encoded JSON input, e.g. `{\"projectId\":\"project-id\"}`",
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Project details." },
          },
        },
      },
      "/trpc/project.delete": {
        post: {
          tags: ["Projects"],
          summary: "Delete Project",
          description: "Delete a project, unlinking files and triggering repository metadata cleanups.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    projectId: { type: "string" },
                  },
                  required: ["projectId"],
                },
              },
            },
          },
          responses: {
            200: { description: "Project deletion scheduled." },
          },
        },
      },
      "/trpc/github.getInstallationStatus": {
        get: {
          tags: ["Projects"],
          summary: "Get GitHub Connection Status",
          description: "Verify if the workspace's GitHub App link is active.",
          responses: {
            200: { description: "Connection status details." },
          },
        },
      },
      "/trpc/github.disconnectApp": {
        post: {
          tags: ["Projects"],
          summary: "Disconnect GitHub App",
          description: "Unlink the GitHub App installation from the authenticated user's workspace.",
          responses: {
            200: { description: "GitHub App disconnected." },
          },
        },
      },
      "/trpc/github.getRepos": {
        get: {
          tags: ["Projects"],
          summary: "Get Installed Repositories",
          description: "Fetch repositories allowed by the GitHub App installation.",
          parameters: [
            {
              name: "input",
              in: "query",
              required: true,
              description: "URL-encoded JSON input, e.g. `{\"page\":1}`",
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "List of repositories." },
          },
        },
      },
      "/trpc/repoSync.sync": {
        post: {
          tags: ["Projects"],
          summary: "Sync Repository Context",
          description: "Manually trigger parsing and vector indexing of codebase context.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    repoFullName: { type: "string" },
                  },
                  required: ["repoFullName"],
                },
              },
            },
          },
          responses: {
            200: { description: "Sync request dispatched." },
          },
        },
      },
      "/trpc/features.list": {
        get: {
          tags: ["Features"],
          summary: "List Project Features",
          description: "Retrieve all features linked to a specific project.",
          parameters: [
            {
              name: "input",
              in: "query",
              required: true,
              description: "URL-encoded JSON input, e.g. `{\"projectId\":\"project-id\"}`",
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "List of features." },
          },
        },
      },
      "/trpc/features.create": {
        post: {
          tags: ["Features"],
          summary: "Create Feature",
          description: "Submit a new feature request, initiating the AI PM discovery flow.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    projectId: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["projectId", "title", "description"],
                },
              },
            },
          },
          responses: {
            200: { description: "Feature request created successfully." },
          },
        },
      },
      "/trpc/features.get": {
        get: {
          tags: ["Features"],
          summary: "Get Feature Details",
          description: "Fetch details of a single feature request, including PRD specifications and links.",
          parameters: [
            {
              name: "input",
              in: "query",
              required: true,
              description: "URL-encoded JSON input, e.g. `{\"featureId\":\"feature-id\"}`",
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Feature details." },
          },
        },
      },
      "/trpc/features.getChat": {
        get: {
          tags: ["Features"],
          summary: "Get Discovery Chat Logs",
          description: "Retrieve the requirements-discovery dialogue for a feature request.",
          parameters: [
            {
              name: "input",
              in: "query",
              required: true,
              description: "URL-encoded JSON input, e.g. `{\"featureId\":\"feature-id\"}`",
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Discovery chat logs." },
          },
        },
      },
      "/trpc/features.sendMessage": {
        post: {
          tags: ["Features"],
          summary: "Send Message to AI PM",
          description: "Send a chat message to clarify requirements during AI PM discovery.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    featureId: { type: "string" },
                    message: { type: "string" },
                  },
                  required: ["featureId", "message"],
                },
              },
            },
          },
          responses: {
            200: { description: "Message sent and processed." },
          },
        },
      },
      "/trpc/features.skipQuestion": {
        post: {
          tags: ["Features"],
          summary: "Skip Current Question",
          description: "Instruct the AI PM to bypass the current question with an optional reason.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    featureId: { type: "string" },
                    reason: { type: "string" },
                  },
                  required: ["featureId"],
                },
              },
            },
          },
          responses: {
            200: { description: "Bypassed current question." },
          },
        },
      },
      "/trpc/features.approveRelease": {
        post: {
          tags: ["Features"],
          summary: "Approve Release",
          description: "Approve a feature in ready_for_review status and mark it as completed.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    featureId: { type: "string" },
                  },
                  required: ["featureId"],
                },
              },
            },
          },
          responses: {
            200: { description: "Release approved and feature status set to shipped." },
          },
        },
      },
      "/trpc/features.rejectRelease": {
        post: {
          tags: ["Features"],
          summary: "Reject Release",
          description: "Reject the release of a feature and demote it back to development phase with revision feedback.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    featureId: { type: "string" },
                    reason: { type: "string" },
                  },
                  required: ["featureId", "reason"],
                },
              },
            },
          },
          responses: {
            200: { description: "Release rejected and feature sent back to planning with updates." },
          },
        },
      },
      "/trpc/features.delete": {
        post: {
          tags: ["Features"],
          summary: "Delete Feature Request",
          description: "Deletes a feature request and triggers cleanups of task boards and Git specification folders.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    featureId: { type: "string" },
                  },
                  required: ["featureId"],
                },
              },
            },
          },
          responses: {
            200: { description: "Feature request deleted." },
          },
        },
      },
      "/trpc/features.reopenDiscovery": {
        post: {
          tags: ["Features"],
          summary: "Redesign Feature",
          description: "Reset compiled feature specs back to discovery chat to begin specifications redesign.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    featureId: { type: "string" },
                  },
                  required: ["featureId"],
                },
              },
            },
          },
          responses: {
            200: { description: "Feature reset back to discovery." },
          },
        },
      },
      "/trpc/features.updatePrd": {
        post: {
          tags: ["Features"],
          summary: "Manual PRD Edit",
          description: "Directly modify a feature's raw PRD Markdown content and trigger engineering task updates.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    featureId: { type: "string" },
                    rawContent: { type: "string" },
                  },
                  required: ["featureId", "rawContent"],
                },
              },
            },
          },
          responses: {
            200: { description: "PRD updated successfully." },
          },
        },
      },
      "/trpc/tasks.list": {
        get: {
          tags: ["Tasks"],
          summary: "List Kanban Tasks",
          description: "Retrieve all Kanban board tasks associated with a project.",
          parameters: [
            {
              name: "input",
              in: "query",
              required: true,
              description: "URL-encoded JSON input, e.g. `{\"projectId\":\"project-id\"}`",
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "List of Kanban tasks." },
          },
        },
      },
      "/trpc/tasks.create": {
        post: {
          tags: ["Tasks"],
          summary: "Create Task",
          description: "Manually add a task to the project's Kanban board.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    projectId: { type: "string" },
                    prdId: { type: "string", nullable: true },
                    title: { type: "string" },
                    description: { type: "string", nullable: true },
                  },
                  required: ["projectId", "title"],
                },
              },
            },
          },
          responses: {
            200: { description: "Task created successfully." },
          },
        },
      },
      "/trpc/tasks.updateStatus": {
        post: {
          tags: ["Tasks"],
          summary: "Update Task Status",
          description: "Move a Kanban task to a new stage (todo, in_progress, review, done).",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    taskId: { type: "string" },
                    status: { type: "string", enum: ["todo", "in_progress", "review", "done"] },
                  },
                  required: ["taskId", "status"],
                },
              },
            },
          },
          responses: {
            200: { description: "Task status updated." },
          },
        },
      },
      "/trpc/tasks.delete": {
        post: {
          tags: ["Tasks"],
          summary: "Delete Task",
          description: "Remove a task from the project's Kanban board.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    taskId: { type: "string" },
                  },
                  required: ["taskId"],
                },
              },
            },
          },
          responses: {
            200: { description: "Task deleted successfully." },
          },
        },
      },
      "/trpc/tasks.approvePlan": {
        post: {
          tags: ["Tasks"],
          summary: "Approve Plan & Start Development",
          description: "Approve the auto-generated tasks and transition feature to development.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    featureId: { type: "string" },
                  },
                  required: ["featureId"],
                },
              },
            },
          },
          responses: {
            200: { description: "Planning approved and feature set to development status." },
          },
        },
      },
      "/trpc/billing.getBillingState": {
        get: {
          tags: ["Billing"],
          summary: "Get Billing Status",
          description: "Fetch the authenticated user's Lemon Squeezy subscription state and PR review counts.",
          responses: {
            200: { description: "Subscription status details." },
          },
        },
      },
      "/trpc/billing.createCheckout": {
        post: {
          tags: ["Billing"],
          summary: "Create Lemon Squeezy Checkout",
          description: "Generate a billing portal checkout session URL.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    variantId: { type: "string" },
                  },
                  required: ["variantId"],
                },
              },
            },
          },
          responses: {
            200: { description: "Checkout session created." },
          },
        },
      },
      "/api/github/webhook": {
        post: {
          tags: ["Webhooks"],
          summary: "GitHub App Webhook",
          description: "Endpoint to receive pushed commits and PR synchronization webhooks.",
          responses: {
            200: { description: "Webhook received." },
          },
        },
      },
      "/api/billing/webhook": {
        post: {
          tags: ["Webhooks"],
          summary: "Lemon Squeezy Billing Webhook",
          description: "Listens for Lemon Squeezy checkout completions, variant switches, and cancel events.",
          responses: {
            200: { description: "Webhook consumed successfully." },
          },
        },
      },
    },
  };

  const html = `
<!doctype html>
<html lang="en">
  <head>
    <title>AI Code Reviewer API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        background-color: #0d0e11;
      }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      type="application/json"
      data-configuration='{"theme": "purple", "layout": "modern", "showSidebar": true}'>
      ${JSON.stringify(openapiSpec)}
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
