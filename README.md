<div align="center">
  <img src="apps/web/public/new_logo.png" alt="TheShip.ai Logo" width="80" />
  <h1>TheShip.ai</h1>
  <p><strong>AI-powered code reviewer and feature shipping platform for GitHub</strong></p>
  <p>
    <a href="https://theship.vercel.app/">🌐 Live App</a> •
    <a href="#setup-instructions">🚀 Get Started</a> •
    <a href="#architecture">🏗️ Architecture</a>
  </p>
</div>

---

## Project Overview

**TheShip.ai** is a full-stack AI development platform that connects GitHub repositories to a structured feature-shipping workflow. When a developer opens a Pull Request, TheShip automatically:

1. Fetches the PR diff from GitHub
2. Matches it against the feature's **Product Requirements Document (PRD)** and planned **engineering tasks**
3. Runs an AI review (Staff-Engineer level) checking PRD compliance, security, correctness, and reliability
4. Posts the review as a GitHub comment and updates task statuses on the Kanban board

Beyond PR reviews, the platform also manages the full **feature lifecycle** — from idea discovery, through AI-assisted PRD generation and task planning, to shipping.

---

## Tech Stack

### Frontend (`apps/web`)
| Technology | Purpose |
|---|---|
| **Next.js 16** (App Router) | Full-stack React framework |
| **TypeScript** | Type safety throughout |
| **Tailwind CSS v4** | Utility-first styling |
| **shadcn/ui** | Accessible component library |
| **Phosphor Icons** | Icon set |
| **Recharts** | Charts and analytics |
| **tRPC** (`@trpc/react-query`) | End-to-end typesafe API client |
| **TanStack Query** | Server state management |
| **Embla Carousel** | UI carousels |

### Backend (`apps/api` + `apps/web` API Routes)
| Technology | Purpose |
|---|---|
| **tRPC** | Typesafe API layer (shared with frontend) |
| **Inngest** | Durable background job orchestration |
| **Better Auth** | Authentication (GitHub OAuth) |
| **Octokit** | GitHub App integration |
| **Vercel AI SDK** | AI text generation abstraction |
| **OpenRouter** | LLM provider (model-agnostic) |
| **Pinecone** | Vector database for semantic code search |

### Data Layer (`packages/database`)
| Technology | Purpose |
|---|---|
| **Prisma 7** | ORM and schema management |
| **PostgreSQL** | Primary relational database |
| **`@prisma/adapter-pg`** | Native pg driver adapter |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Turborepo** | Monorepo build system |
| **pnpm** | Package manager with workspaces |
| **Vercel** | Deployment platform |

---

## Architecture

```
ai-code-reviewer-trpc/          ← Turborepo monorepo root
├── apps/
│   ├── web/                    ← Next.js 16 App Router (frontend + API routes)
│   │   ├── app/
│   │   │   ├── (auth)/         ← Sign-in page
│   │   │   ├── (protected)/    ← Dashboard, Admin (auth-guarded layouts)
│   │   │   │   ├── admin/      ← Admin panel (owner-only)
│   │   │   │   └── dashboard/  ← Main user workspace
│   │   │   ├── api/
│   │   │   │   ├── auth/       ← Better Auth handler
│   │   │   │   ├── billing/    ← LemonSqueezy webhook
│   │   │   │   ├── github/     ← GitHub App webhook + OAuth callback
│   │   │   │   ├── inngest/    ← Inngest function handler
│   │   │   │   └── trpc/       ← tRPC HTTP handler
│   │   │   └── page.tsx        ← Landing page
│   │   └── features/
│   │       ├── reviews/        ← PR review pipeline (core feature)
│   │       ├── github/         ← GitHub App client, webhook handling
│   │       ├── repo-sync/      ← Repository vectorization
│   │       ├── git-sync/       ← .theship folder sync
│   │       ├── inngest/        ← Inngest client + function registry
│   │       └── auth/           ← Better Auth config
│   │
│   └── api/                    ← Express API server (tRPC adapter)
│
└── packages/
    ├── database/               ← Prisma schema + generated client
    ├── trpc/                   ← Shared tRPC router definitions
    └── utils/                  ← Shared utility functions
```

### Data Flow — PR Review

```
GitHub PR opened/updated
        │
        ▼
GitHub App Webhook → /api/github/webhook
        │
        ▼
Save PullRequest to DB → emit "github/pr.received" Inngest event
        │
        ▼
Inngest: reviewPullRequest function
        ├── 1. Check billing limits (free: 2, starter: 12, unlimited: ∞)
        ├── 2. Fetch PR diff from GitHub API
        ├── 3. Chunk code → save to Pinecone (vector search)
        ├── 4. Search repo context via Pinecone semantic search
        ├── 5. Fetch PRD context:
        │       a. Read .theship/features/<slug>/01_PRD.md from PR branch
        │       b. Slug-match against DB FeatureRequest titles
        │       c. Fallback: use featureRequestId already linked
        │       d. Fallback: most recently updated active feature
        ├── 6. Generate AI review (OpenRouter LLM via Vercel AI SDK)
        ├── 7. Parse [TASK_UPDATES] JSON → update Task statuses in DB
        ├── 8. Post review as GitHub PR comment
        └── 9. Update PR status (reviewed / fix_needed / rate_limited)
```

---

## Setup Instructions

### Prerequisites
- Node.js 20+
- pnpm 11+
- PostgreSQL database (e.g., [Neon](https://neon.tech/))
- GitHub App (see [GitHub Integration Setup](#github-integration-setup))
- [Inngest](https://inngest.com/) account
- [OpenRouter](https://openrouter.ai/) API key
- [Pinecone](https://pinecone.io/) account

### 1. Clone and install

```bash
git clone https://github.com/AbdulSamad001122/ai-code-reviewer-trpc.git
cd ai-code-reviewer-trpc
pnpm install
```

### 2. Configure environment variables

Copy the example and fill in all values:

```bash
cp .env.example .env
```

### 3. Set up the database

```bash
cd packages/database
pnpm prisma migrate dev
pnpm prisma generate
```

### 4. Run the development server

```bash
pnpm dev
```

The web app runs at `http://localhost:3000`.

---

## Environment Variables

```env
# ─── Database ────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# ─── Auth (Better Auth) ──────────────────────────────────────
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3000

# ─── GitHub App ──────────────────────────────────────────────
GITHUB_APP_ID=123456
GITHUB_APP_NAME=your-app-name
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxx
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_WEBHOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_GITHUB_PUBLIC_LINK=https://github.com/apps/your-app-name

# ─── AI / LLM ────────────────────────────────────────────────
OPENROUTER_API_KEY=sk-or-...
AI_MODEL=openrouter/auto          # or any OpenRouter model slug

# ─── Vector Database ─────────────────────────────────────────
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_HOST=https://your-index.pinecone.io
PINECONE_INDEX=your-index-name

# ─── Background Jobs ─────────────────────────────────────────
INNGEST_EVENT_KEY=evt_...
INNGEST_SIGNING_KEY=signkey-...
INNGEST_DEV=true                  # remove in production

# ─── Billing (LemonSqueezy) ──────────────────────────────────
# (Optional — only needed for paid plan features)

# ─── Admin ───────────────────────────────────────────────────
ADMIN_EMAIL=your@email.com        # email that gets access to /admin

# ─── Backend ─────────────────────────────────────────────────
BACKEND_API_URL=http://localhost:3001
```

---

## Database Schema Notes

The core models and their relationships:

```
User
 ├── sessions[]           → active login sessions
 ├── accounts[]           → OAuth providers (GitHub)
 ├── githubInstallation   → GitHub App install record
 ├── workspaceMembers[]   → membership in workspaces
 └── subscriptionPlan     → "free" | "starter" | "unlimited"

Workspace
 ├── members[]            → WorkspaceMember (owner | member)
 └── projects[]

Project
 ├── repoFullName         → linked GitHub repository (e.g. "owner/repo")
 ├── featureRequests[]    → feature pipeline
 └── tasks[]             → engineering tasks

FeatureRequest
 ├── status              → discovery → prd_generation → planning
 │                          → development → ready_for_review → shipped
 ├── prd                 → one PRD per feature
 ├── pullRequests[]      → linked GitHub PRs
 └── chatMessages[]      → AI conversation history

PRD (Product Requirements Document)
 ├── problemStatement
 ├── goals[]
 ├── acceptanceCriteria[]
 ├── userStories[]
 ├── rawContent          → full markdown source
 └── tasks[]             → engineering tasks for this PRD

Task
 └── status             → todo | in_progress | review | done

PullRequest
 ├── repoFullName + prNumber  → unique identifier
 ├── featureRequestId         → linked feature (for PRD matching)
 ├── status                   → pending | processing | reviewed | fix_needed | rate_limited
 └── reviewComment            → stored AI review markdown
```

---

## GitHub Integration Setup

### 1. Create a GitHub App

1. Go to **GitHub → Settings → Developer Settings → GitHub Apps → New GitHub App**
2. Configure:
   - **Homepage URL**: `https://theship.vercel.app`
   - **Callback URL**: `https://theship.vercel.app/api/github/callback`
   - **Webhook URL**: `https://theship.vercel.app/api/github/webhook`
   - **Webhook Secret**: generate a random secret → save as `GITHUB_WEBHOOK_SECRET`
3. **Permissions required**:
   - Repository: `Contents` (read), `Pull Requests` (read & write), `Metadata` (read)
4. **Subscribe to events**: `Pull Request`
5. Generate a **Private Key** → download → paste into `GITHUB_APP_PRIVATE_KEY`

### 2. Install the App

After creating, install the app on the target repositories. The install callback at `/api/github/callback` will store the `installationId` in the DB against the user.

### 3. .theship folder convention

TheShip reads a `.theship/` folder from the **PR branch** to match PRs to features:

```
.theship/
└── features/
    └── my-feature-slug/        ← slug must match the FeatureRequest title
        ├── 01_PRD.md           ← Full PRD in markdown
        └── 02_TASKS.json       ← Engineering tasks array
```

`02_TASKS.json` format:
```json
[
  { "id": "task-001", "title": "Create API endpoint", "description": "...", "status": "todo" },
  { "id": "task-002", "title": "Add UI component", "description": "...", "status": "todo" }
]
```

---

## Inngest Workflow Explanation

[Inngest](https://inngest.com/) handles all durable background processing. Functions are registered at `/api/inngest`.

### `reviewPullRequest` — `github/pr.received`

The main review pipeline. Each step is durable and retried independently:

| Step | What it does |
|---|---|
| `mark-processing` | Sets PR status to `processing` in DB |
| `check-billing-limits` | Verifies the workspace owner hasn't exceeded plan limits |
| `breakdown-code` | Fetches PR files and chunks them for vector storage |
| `save-vectors-to-pinecone` | Embeds and stores code chunks in Pinecone |
| `wait-for-vectors-to-index` | 10s sleep to let Pinecone index settle |
| `search-repo-context` | Semantic search for relevant existing code |
| `fetch-prd-context` | Reads `.theship/01_PRD.md` from GitHub + syncs DB |
| `fetch-pr-files` | Fetches full file diffs from GitHub API |
| `generate-ai-review` | Sends PRD + diff + tasks to LLM, gets review |
| `parse-and-apply-task-updates` | Parses `[TASK_UPDATES]` JSON, updates DB task statuses |
| `trigger-git-sync` | Triggers `.theship` folder sync back to repo |
| `post-pr-comment` | Posts the AI review as a GitHub PR comment |
| `mark-reviewed` | Sets final PR status (`reviewed` / `fix_needed`) |

### `repoSync` — `app/repo.sync.requested`

Crawls the entire GitHub repository, chunks all source files, and stores them in Pinecone under a repo-scoped namespace. Used to provide semantic codebase context during reviews.

### `gitSync` — `app/git_sync.requested`

Writes updated task statuses back to `.theship/features/<slug>/02_TASKS.json` in the repository, keeping the repo and database in sync.

---

## AI Features Implemented

### 1. 🔍 PRD-Aware PR Review
The core feature. The AI acts as a **Staff-Level Software Engineer** and:
- Checks every **acceptance criterion** from the PRD against the diff
- Flags missing or incorrectly implemented requirements as `[BLOCKING]`
- Reviews for **security vulnerabilities**, **bugs**, **performance regressions**
- Produces a structured verdict: `APPROVE` / `APPROVE WITH SUGGESTIONS` / `REQUEST CHANGES`

### 2. 📋 Kanban Task Auto-Transitions
After reviewing, the AI outputs a `[TASK_UPDATES]` JSON block. The system parses it and automatically moves tasks from `todo` → `in_progress` → `review` based on what the PR implements.

### 3. 💬 Feature Chat (AI Assistant)
Each feature has an AI chat thread. The AI can:
- Answer questions about the feature's PRD and implementation status
- Summarize review results in plain language
- Notify about rate-limit events or PR status changes

### 4. 📄 PRD Generation
From a plain-language feature description, the AI generates a structured PRD with:
- Problem statement, goals, non-goals
- User stories, acceptance criteria
- Edge cases, success metrics

### 5. 🗂️ Task Planning
After a PRD is generated, the AI breaks the feature into a set of granular engineering tasks with titles and descriptions, saved to the DB and `.theship/02_TASKS.json`.

### 6. 🔎 Semantic Codebase Search (Vector RAG)
When reviewing a PR, the system queries Pinecone with the PR title to find semantically related code from the existing codebase. This gives the AI reviewer context about how the rest of the project is structured.

---

## Review Limits by Plan

| Plan | PR Reviews |
|---|---|
| Free | 2 / lifetime |
| Starter | 12 / billing period |
| Unlimited | Unlimited |

---

## Admin Panel

Accessible at `/admin` — restricted to `ADMIN_EMAIL` only.

- View all users, plans, and review counts
- Filter/sort by plan, name, email, activity
- Drill into any user to see their workspaces, projects, features, AI chat history, and token usage
- Delete users
- Token usage risk meter (Low / Medium / High) per user

---

<div align="center">
  <p>Built with ❤️ for the Hackathon</p>
  <p><a href="https://theship.vercel.app/">https://theship.vercel.app/</a></p>
</div>
