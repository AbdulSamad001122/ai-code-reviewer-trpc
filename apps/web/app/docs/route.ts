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
      { name: "Workspaces", description: "Workspace management" },
      { name: "Projects", description: "Project creation, repo linkage, and deletions" },
      { name: "Features", description: "AI PM chat discovery, PRD generation, and release center actions" },
      { name: "Tasks", description: "Kanban board tasks management" },
      { name: "Billing", description: "Stripe checkout and subscription info" },
      { name: "Webhooks", description: "GitHub and Stripe webhook endpoints" },
    ],
    paths: {
      "/trpc/health": {
        get: {
          tags: ["System"],
          summary: "Health Check",
          description: "Check if the backend tRPC service is running.",
          responses: {
            200: {
              description: "System is healthy.",
            },
          },
        },
      },
      "/trpc/workspace.list": {
        get: {
          tags: ["Workspaces"],
          summary: "List Workspaces",
          description: "Retrieve all workspaces the user is part of.",
          responses: {
            200: {
              description: "List of workspaces.",
            },
          },
        },
      },
      "/trpc/workspace.create": {
        post: {
          tags: ["Workspaces"],
          summary: "Create Workspace",
          description: "Create a new workspace inside the platform.",
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
            200: {
              description: "Workspace created successfully.",
            },
          },
        },
      },
      "/trpc/project.list": {
        get: {
          tags: ["Projects"],
          summary: "List Workspace Projects",
          description: "Retrieve all projects within a specified workspace.",
          parameters: [
            {
              name: "input",
              in: "query",
              required: true,
              description: "URL-encoded JSON input, e.g. `{\"workspaceId\":\"workspace-id\"}`",
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            200: {
              description: "List of workspace projects.",
            },
          },
        },
      },
      "/trpc/project.create": {
        post: {
          tags: ["Projects"],
          summary: "Create Project",
          description: "Link a GitHub repository to a workspace as a new project.",
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
            200: {
              description: "Project linked successfully.",
            },
          },
        },
      },
      "/trpc/project.delete": {
        post: {
          tags: ["Projects"],
          summary: "Delete Project",
          description: "Delete a project, unlinking files and triggering background cleanup.",
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
            200: {
              description: "Project deletion scheduled.",
            },
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
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            200: {
              description: "List of features.",
            },
          },
        },
      },
      "/trpc/features.create": {
        post: {
          tags: ["Features"],
          summary: "Create Feature",
          description: "Submit a new feature request, initializing the AI PM discovery flow.",
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
            200: {
              description: "Feature request created successfully.",
            },
          },
        },
      },
      "/trpc/features.sendMessage": {
        post: {
          tags: ["Features"],
          summary: "Send Message to AI PM",
          description: "Send a chat message to the AI PM to clarify requirements during discovery.",
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
            200: {
              description: "Message sent and processed.",
            },
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
            200: {
              description: "Bypassed current question.",
            },
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
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            200: {
              description: "List of Kanban tasks.",
            },
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
            200: {
              description: "Task status updated.",
            },
          },
        },
      },
      "/trpc/github.getInstallationStatus": {
        get: {
          tags: ["Projects"],
          summary: "Get GitHub Connection Status",
          description: "Verify if the workspace's GitHub App link is active.",
          responses: {
            200: {
              description: "Connection status details.",
            },
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
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            200: {
              description: "List of repositories.",
            },
          },
        },
      },
      "/api/github/webhook": {
        post: {
          tags: ["Webhooks"],
          summary: "GitHub App Webhooks",
          description: "Receives events from the GitHub App installation.",
          responses: {
            200: {
              description: "Webhook consumed successfully.",
            },
          },
        },
      },
      "/api/billing/webhook": {
        post: {
          tags: ["Webhooks"],
          summary: "Stripe Billing Webhook",
          description: "Processes Stripe checkout and active subscription updates.",
          responses: {
            200: {
              description: "Webhook consumed successfully.",
            },
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
