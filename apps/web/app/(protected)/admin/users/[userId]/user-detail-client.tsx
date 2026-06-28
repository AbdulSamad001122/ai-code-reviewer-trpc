"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Crown,
  GitPullRequest,
  ChatCircleText,
  FolderOpen,
  Kanban,
  Robot,
  User,
  GitBranch,
  Clock,
  ChartBar,
  Laptop,
  CheckCircle,
  Circle,
  ArrowClockwise,
  Hourglass,
  Warning,
} from "@phosphor-icons/react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ChatMessage = {
  id: string;
  sender: string;
  message: string;
  createdAt: Date;
};

type PullRequest = {
  id: string;
  title: string;
  prNumber: number;
  repoFullName: string;
  status: string;
  createdAt: Date;
};

type Feature = {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  chatMessageCount: number;
  hasPrd: boolean;
  pullRequestCount: number;
  pullRequests: PullRequest[];
  chatMessages: ChatMessage[];
};

type Task = {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  repoFullName: string;
  branch: string;
  createdAt: Date;
  featureCount: number;
  taskCount: number;
  tasks: Task[];
  features: Feature[];
};

type Workspace = {
  id: string;
  name: string;
  role: string;
  createdAt: Date;
  projectCount: number;
  projects: Project[];
};

type Session = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
};

type UserDetail = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: Date;
  subscriptionPlan: string;
  subscriptionStatus: string | null;
  prReviewCount: number;
  renewsAt: Date | null;
  githubLogin: string | null;
  sessions: Session[];
  workspaces: Workspace[];
  totalAiMessages: number;
  totalUserMessages: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PLAN_COLORS: Record<string, string> = {
  free: "bg-zinc-700/60 text-zinc-300",
  starter: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  unlimited: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
};

const STATUS_STYLES: Record<string, string> = {
  discovery: "bg-purple-500/20 text-purple-300",
  prd_generation: "bg-blue-500/20 text-blue-300",
  planning: "bg-cyan-500/20 text-cyan-300",
  development: "bg-amber-500/20 text-amber-300",
  ready_for_review: "bg-orange-500/20 text-orange-300",
  ready_for_release: "bg-green-500/20 text-green-300",
  shipped: "bg-[#D7FFA4]/20 text-[#D7FFA4]",
};

const TASK_STATUS_ICON: Record<string, React.ReactNode> = {
  todo: <Circle size={13} className="text-white/30" />,
  in_progress: <ArrowClockwise size={13} className="text-amber-400 animate-spin" />,
  review: <Hourglass size={13} className="text-blue-400" />,
  done: <CheckCircle size={13} className="text-[#D7FFA4]" weight="fill" />,
};

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtShort(d: Date) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChatViewer({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0)
    return <p className="text-xs text-white/30 py-4 text-center">No chat messages yet.</p>;

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex gap-2 ${msg.sender === "ai" ? "flex-row" : "flex-row-reverse"}`}
        >
          <div
            className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs mt-0.5 ${
              msg.sender === "ai"
                ? "bg-[#D7FFA4]/20 text-[#D7FFA4]"
                : "bg-blue-500/20 text-blue-300"
            }`}
          >
            {msg.sender === "ai" ? <Robot size={12} /> : <User size={12} />}
          </div>
          <div
            className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
              msg.sender === "ai"
                ? "bg-white/5 text-white/80"
                : "bg-blue-500/10 text-blue-200"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
            <p className="mt-1 text-white/25 text-[10px]">{fmt(msg.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const [showChat, setShowChat] = useState(false);
  const [showPRs, setShowPRs] = useState(false);

  const aiCount = feature.chatMessages.filter((m) => m.sender === "ai").length;
  const userCount = feature.chatMessages.filter((m) => m.sender === "user").length;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      {/* Feature header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize ${
                STATUS_STYLES[feature.status] ?? "bg-white/10 text-white/50"
              }`}
            >
              {feature.status.replace(/_/g, " ")}
            </span>
            {feature.hasPrd && (
              <span className="inline-block rounded-md bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                PRD ✓
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm font-medium text-white leading-snug">{feature.title}</p>
          <p className="text-[10px] text-white/30 mt-0.5">{fmtShort(feature.createdAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-white/50">
          <span className="flex items-center gap-1">
            <Robot size={12} className="text-[#D7FFA4]" />
            {aiCount} AI
          </span>
          <span className="flex items-center gap-1">
            <User size={12} className="text-blue-400" />
            {userCount} user
          </span>
          <span className="flex items-center gap-1">
            <GitPullRequest size={12} className="text-orange-400" />
            {feature.pullRequestCount} PR
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex border-t border-white/5">
        <button
          onClick={() => { setShowChat(!showChat); setShowPRs(false); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
            showChat ? "bg-[#D7FFA4]/10 text-[#D7FFA4]" : "text-white/40 hover:text-white/70 hover:bg-white/5"
          }`}
        >
          <ChatCircleText size={13} />
          View Chats ({feature.chatMessageCount})
        </button>
        {feature.pullRequestCount > 0 && (
          <button
            onClick={() => { setShowPRs(!showPRs); setShowChat(false); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border-l border-white/5 transition-colors cursor-pointer ${
              showPRs ? "bg-orange-500/10 text-orange-400" : "text-white/40 hover:text-white/70 hover:bg-white/5"
            }`}
          >
            <GitPullRequest size={13} />
            View PRs ({feature.pullRequestCount})
          </button>
        )}
      </div>

      {/* Chat viewer */}
      {showChat && (
        <div className="border-t border-white/5 p-4 bg-black/20">
          <ChatViewer messages={feature.chatMessages} />
        </div>
      )}

      {/* PRs viewer */}
      {showPRs && feature.pullRequests.length > 0 && (
        <div className="border-t border-white/5 p-4 bg-black/20 space-y-2">
          {feature.pullRequests.map((pr) => (
            <div
              key={pr.id}
              className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
            >
              <div>
                <p className="text-xs font-medium text-white">
                  #{pr.prNumber} {pr.title}
                </p>
                <p className="text-[10px] text-white/30">{pr.repoFullName}</p>
              </div>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize ${
                  pr.status === "reviewed"
                    ? "bg-[#D7FFA4]/20 text-[#D7FFA4]"
                    : pr.status === "processing"
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-white/10 text-white/50"
                }`}
              >
                {pr.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectSection({ project }: { project: Project }) {
  const [tab, setTab] = useState<"features" | "tasks">("features");

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      {/* Project header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch size={14} className="text-[#D7FFA4]" />
            <span className="font-semibold text-white">{project.name}</span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50 font-mono">
              {project.branch}
            </span>
          </div>
          <p className="text-xs text-white/40 mt-0.5">{project.repoFullName}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span>{project.featureCount} features</span>
          <span>{project.taskCount} tasks</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {(["features", "tasks"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-xs font-semibold capitalize transition-colors cursor-pointer ${
              tab === t
                ? "border-b-2 border-[#D7FFA4] text-[#D7FFA4]"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {tab === "features" ? (
          project.features.length === 0 ? (
            <p className="text-center text-xs text-white/30 py-6">No features yet.</p>
          ) : (
            project.features.map((f) => <FeatureCard key={f.id} feature={f} />)
          )
        ) : (
          project.tasks.length === 0 ? (
            <p className="text-center text-xs text-white/30 py-6">No tasks yet.</p>
          ) : (
            <div className="space-y-1.5">
              {project.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2"
                >
                  {TASK_STATUS_ICON[task.status] ?? <Circle size={13} className="text-white/30" />}
                  <span className="flex-1 text-xs text-white/80 truncate">{task.title}</span>
                  <span className="text-[10px] text-white/30 capitalize shrink-0">
                    {task.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function UserDetailClient({ user }: { user: UserDetail }) {
  const [activeWorkspace, setActiveWorkspace] = useState<string>(
    user.workspaces[0]?.id ?? ""
  );

  const workspace = user.workspaces.find((w) => w.id === activeWorkspace);

  // Overall token usage stats
  const totalChats = user.totalAiMessages + user.totalUserMessages;
  const tokenRiskLevel =
    user.totalAiMessages > 100
      ? "high"
      : user.totalAiMessages > 40
      ? "medium"
      : "low";

  const riskColors = {
    high: "border-red-500/40 bg-red-500/10 text-red-400",
    medium: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    low: "border-[#D7FFA4]/30 bg-[#D7FFA4]/10 text-[#D7FFA4]",
  };

  return (
    <div className="min-h-screen w-full bg-[#051112] text-white font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#051112]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              Admin Panel
            </a>
            <span className="text-white/20">/</span>
            <span className="text-sm font-semibold text-white">{user.name}</span>
          </div>
          <span className="rounded-md bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400 border border-red-500/30">
            ADMIN
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* User profile card */}
        <div className="flex flex-col sm:flex-row gap-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-4">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name}
                className="size-16 rounded-2xl object-cover ring-2 ring-white/10"
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-2xl bg-[#D7FFA4]/20 text-2xl font-bold text-[#D7FFA4]">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{user.name}</h1>
              <p className="text-sm text-white/50">{user.email}</p>
              {user.githubLogin && (
                <p className="text-xs text-white/30 mt-0.5">
                  GitHub: @{user.githubLogin}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 sm:ml-auto items-start">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-center">
              <p className="text-xs text-white/40">Plan</p>
              <span className={`mt-1 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${PLAN_COLORS[user.subscriptionPlan] ?? PLAN_COLORS.free}`}>
                {user.subscriptionPlan === "unlimited" && <Crown size={10} />}
                {user.subscriptionPlan}
              </span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-center">
              <p className="text-xs text-white/40">PR Reviews</p>
              <p className="mt-1 text-lg font-bold text-white">{user.prReviewCount}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-center">
              <p className="text-xs text-white/40">Workspaces</p>
              <p className="mt-1 text-lg font-bold text-white">{user.workspaces.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-center">
              <p className="text-xs text-white/40">Joined</p>
              <p className="mt-1 text-xs font-medium text-white">{fmtShort(user.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Token Usage Alert */}
        <div className={`rounded-2xl border p-5 ${riskColors[tokenRiskLevel]}`}>
          <div className="flex items-center gap-3">
            {tokenRiskLevel === "high" ? (
              <Warning size={20} weight="fill" />
            ) : (
              <Robot size={20} />
            )}
            <div>
              <p className="font-semibold text-sm">
                AI Token Usage
                {tokenRiskLevel === "high" && " — ⚠️ High Usage Detected"}
                {tokenRiskLevel === "medium" && " — Moderate Usage"}
                {tokenRiskLevel === "low" && " — Normal Usage"}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {user.totalAiMessages} AI responses · {user.totalUserMessages} user messages · {totalChats} total chat turns
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-2xl font-black">{user.totalAiMessages}</p>
              <p className="text-xs opacity-70">AI messages</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (user.totalAiMessages / 150) * 100)}%`,
                  background:
                    tokenRiskLevel === "high"
                      ? "#ef4444"
                      : tokenRiskLevel === "medium"
                      ? "#f59e0b"
                      : "#D7FFA4",
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] opacity-60 mt-1">
              <span>0</span>
              <span>50</span>
              <span>100</span>
              <span>150+</span>
            </div>
          </div>
        </div>

        {/* Workspace selector + content */}
        {user.workspaces.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-white/30">
            This user has no workspaces yet.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Workspace tabs */}
            <div className="flex flex-wrap gap-2">
              {user.workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => setActiveWorkspace(ws.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                    activeWorkspace === ws.id
                      ? "bg-[#D7FFA4] text-[#0F2124]"
                      : "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <FolderOpen size={14} />
                  {ws.name}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeWorkspace === ws.id ? "bg-[#0F2124]/30" : "bg-white/10"}`}>
                    {ws.projectCount}
                  </span>
                </button>
              ))}
            </div>

            {/* Projects in selected workspace */}
            {workspace?.projects.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-white/30">
                No projects in this workspace.
              </div>
            ) : (
              <div className="space-y-5">
                {workspace?.projects.map((project) => (
                  <ProjectSection key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Sessions */}
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
            <Laptop size={15} className="text-white/50" />
            <h2 className="font-semibold text-sm text-white">Recent Sessions</h2>
            <span className="ml-auto text-xs text-white/30">{user.sessions.length} shown</span>
          </div>
          <div className="divide-y divide-white/5">
            {user.sessions.length === 0 ? (
              <p className="px-5 py-6 text-center text-xs text-white/30">No sessions.</p>
            ) : (
              user.sessions.map((s) => (
                <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                  <Clock size={13} className="text-white/30 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60 truncate">
                      {s.userAgent ?? "Unknown device"}
                    </p>
                    <p className="text-[10px] text-white/30">
                      IP: {s.ipAddress ?? "—"} · Started {fmt(s.createdAt)}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold shrink-0 ${new Date(s.expiresAt) > new Date() ? "text-[#D7FFA4]" : "text-white/20"}`}>
                    {new Date(s.expiresAt) > new Date() ? "Active" : "Expired"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
