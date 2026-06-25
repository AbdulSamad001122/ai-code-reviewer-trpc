# TheShip AI Monorepo

TheShip is an AI-powered Product & Engineering Workspace designed to bridge the gap between product requirements and code implementation. It guides development through an automated, bidirectional pipeline: from raw feature requests to structured PRDs, auto-compiled engineering task lists, live IDE agent synchronization, pull request AI reviews, and final human release approvals.

---

## 🛠️ Tech Stack

* **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
* **API Layer**: [tRPC](https://trpc.io/) (Type-safe client-server communications)
* **Database**: [PostgreSQL](https://www.postgresql.org/) (Neon Serverless Postgres)
* **ORM**: [Prisma](https://www.prisma.io/) (Prisma Client & Migration engine)
* **Auth**: [BetterAuth](https://www.better-auth.com/) (Secure session & multi-tenant user authentication)
* **Vector Store**: [Pinecone](https://www.pinecone.io/) (Codebase search and similarity matching)
* **Async Orchestration**: [Inngest](https://www.inngest.com/) (Event-driven serverless background queues)
* **Integrations**: [Octokit](https://github.com/octokit/octokit.js) (GitHub API client)
* **AI Engine**: [Vercel AI SDK](https://sdk.vercel.ai/) & [OpenRouter](https://openrouter.ai/) (Clarifications, PRD drafts, task compiling, code reviews)
* **Billing**: [Lemon Squeezy](https://www.lemonsqueezy.com/) (Subscription checkouts, multi-tenant billing status, limit tier enforcements)
* **Styling**: Vanilla CSS & [Shadcn UI](https://ui.shadcn.com/) / Radix Primitives

---

## 🏗️ Architecture

TheShip is structured as a type-safe npm/pnpm workspace monorepo:

```
├── apps
│   └── web                  # Next.js frontend & API routes (Inngest, Auth, Webhooks)
├── packages
│   ├── database             # Prisma schema, client generator, and seed scripts
│   ├── trpc                 # Shared trpc routers (billing, project, features, tasks)
│   └── utils                # Shared types and helpers
└── package.json             # Root monorepo workspace configurations
```

### Flow Diagram (Core Loop)
```
Feature Request ➔ Discovery Chat ➔ Compile PRD ➔ Compile Tasks ➔ Sync to Git (.theship/)
       ▲                                                                   │
       │                                                                   ▼
Human Approval ◀── AI QA Re-Review ◀── Code Commit ◀── PR Webhook ◀── IDE Agent coding
```

---

## 📂 Database Schema Notes

The primary schema modeled in `packages/database/prisma/schema.prisma` is multi-tenant and structured around workspaces:

* **User**: Base account fields, subscription status, plan (`free` | `starter` | `unlimited`), and PR review usage.
* **Workspace**: Multi-tenant group containing members and projects.
* **WorkspaceMember**: Connects users to workspaces with roles (`owner` | `member`).
* **Project**: Repositories linked to workspaces, mapping a name, default branch, and GitHub repository.
* **FeatureRequest**: Kanban request cards containing status (`discovery` | `prd_generation` | `planning` | `development` | `ready_for_review` | `ready_for_release` | `shipped`).
* **PRD**: Product Requirements Document linking goals, acceptance criteria, success metrics, and raw markdown specifications.
* **Task**: Engineering subtasks with status (`todo` | `in_progress` | `review` | `done`).
* **FeatureRequestChat**: Clarification logs between users and the AI PM.
* **PullRequest**: Tracks GitHub pull request status, changed files, and AI review verdicts (`APPROVE` | `REQUEST CHANGES`).

---

## ⚡ Async Workflows (Inngest)

TheShip uses Inngest to manage long-running background tasks. Workflow events are defined in `apps/web/app/api/inngest/route.ts`:

1. **Discovery Workflow (`app/feature.created` / `app/feature.chat_received`)**:
   * Evaluates feature requests using LLMs.
   * Gathers missing context by posting questions to the Chat log.
   * Compiles goals, user stories, acceptance criteria, and compiles a complete PRD.
   * Converts the approved PRD into database tasks.
2. **Git Sync Workflow (`app/git_sync.requested` / `app/feature.deleted`)**:
   * Commits specifications (`.theship/AI_PRIORITY.flag`, `.theship/00_START_HERE.md`, `.theship/features/{slug}/01_PRD.md`, `.theship/features/{slug}/02_TASKS.json`, `.theship/features/{slug}/tasks.md`) to the repository.
   * Deletes directories recursively on GitHub when a feature request is deleted.
   * Commits root guidelines (`.cursorrules` & `CLAUDE.md`) to instruct IDE agents.
3. **Pull Request Review Workflow (`github/pr.received`)**:
   * Fetches changed files/diffs via GitHub REST API.
   * Queries Pinecone codebase vectors for surrounding context.
   * Generates production-grade AI code reviews, categorizing findings as `[BLOCKING]` or `[NON-BLOCKING]`.
   * Posts review verdicts back to GitHub as pull request comments.
   * Moves task statuses inside the Kanban database if task references are checked off.

---

## 🔑 Environment Variables

Create an `.env` file at the root of the workspace:

```env
# Database Connections
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"

# BetterAuth Configuration
BETTER_AUTH_SECRET="your-better-auth-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# GitHub App Integration
GITHUB_APP_ID="your-github-app-id"
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET="your-github-webhook-secret"

# OpenRouter / AI SDK
OPENROUTER_API_KEY="your-openrouter-api-key"

# Inngest Event Queue
INNGEST_EVENT_KEY="your-inngest-event-key"
INNGEST_SIGNING_KEY="your-inngest-signing-key"

# Pinecone Vector Store
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_INDEX_NAME="your-index-name"

# Billing Configuration (Lemon Squeezy)
LEMON_SQUEEZY_STORE_ID="your-store-id"
LEMON_SQUEEZY_API_KEY="your-api-key"
LEMON_SQUEEZY_VARIANT_STARTER="starter-variant-id"
LEMON_SQUEEZY_VARIANT_UNLIMITED="unlimited-variant-id"
```

---

## ⚙️ Setup & Installation

### 1. Prerequisite Installations
* Node.js v20+ and **pnpm** package manager.
* A serverless PostgreSQL instance (Neon).
* A Pinecone database index.

### 2. Install Workspace Dependencies
```bash
pnpm install
```

### 3. Generate Database Client & Seed Database
```bash
# Push schema migrations
pnpm --filter @ai-code-reviewer-trpc/database prisma db push

# Generate Prisma Client
pnpm --filter @ai-code-reviewer-trpc/database prisma generate
```

### 4. Running the Dev Environment
Start Next.js and the Inngest local simulator concurrently:
```bash
# Start Web client & TRPC Server
pnpm dev

# In a separate terminal, start the Inngest background dev server
pnpm inngest
```
Open `http://localhost:3000` to access the dashboard.

---

## 🔌 GitHub Integration Setup

1. **Create GitHub App**: Go to developer settings and create a new GitHub App.
2. **Set Webhooks**: Set the webhook URL pointing to your deployed endpoint (or local tunnels like ngrok/Localtunnel) pointing to `/api/github/webhook`.
3. **Configure Permissions**:
   * **Repository Contents**: `Read & Write` (essential for writing `.theship/` files).
   * **Pull Requests**: `Read & Write` (to fetch changed files and post reviews).
   * **Webhooks Subscriptions**: Enable `Pull request` and `Push` events.
4. **Install App**: Install the App on your target repositories.
