"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  Users,
  MagnifyingGlass,
  ArrowUp,
  ArrowDown,
  Trash,
  Crown,
  GitPullRequest,
  UserCircle,
  ChartBar,
  Warning,
  X,
  Funnel,
} from "@phosphor-icons/react";

type SortKey = "createdAt" | "prReviewCount" | "name" | "email" | "subscriptionPlan";
type SortOrder = "asc" | "desc";
type PlanFilter = "all" | "free" | "starter" | "unlimited";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: Date;
  subscriptionPlan: string;
  subscriptionStatus: string | null;
  prReviewCount: number;
  sessionCount: number;
};

export type AdminStats = {
  totalUsers: number;
  totalReviews: number;
  recentUsers: number;
  planBreakdown: { subscriptionPlan: string; count: number }[];
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-zinc-700/60 text-zinc-300",
  starter: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  unlimited: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
};

const PLAN_ICON: Record<string, React.ReactNode> = {
  free: null,
  starter: <Crown size={11} className="text-blue-400" />,
  unlimited: <Crown size={11} className="text-amber-400" />,
};

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <div className={`mb-3 flex size-10 items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <p className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-white/40">{sub}</p>}
    </div>
  );
}

function DeleteModal({
  user,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  user: { name: string; email: string };
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1f21] p-6 shadow-2xl">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-red-500/20">
          <Warning size={24} className="text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-white">Delete User</h2>
        <p className="mt-2 text-sm text-white/60">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-white">{user.name}</span>{" "}
          <span className="text-white/40">({user.email})</span>? This will remove all their
          data permanently.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-xl bg-red-500/80 py-2.5 text-sm font-bold text-white hover:bg-red-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard({
  initialUsers,
  stats,
}: {
  initialUsers: AdminUser[];
  stats: AdminStats;
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [plan, setPlan] = useState<PlanFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);

  const planBreakdown = useMemo(() => {
    const map: Record<string, number> = { free: 0, starter: 0, unlimited: 0 };
    stats.planBreakdown.forEach((p) => {
      map[p.subscriptionPlan] = p.count;
    });
    return map;
  }, [stats]);

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }

    if (plan !== "all") {
      result = result.filter((u) => u.subscriptionPlan === plan);
    }

    result.sort((a, b) => {
      let aVal: string | number | Date = a[sortBy] as string | number | Date;
      let bVal: string | number | Date = b[sortBy] as string | number | Date;
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, search, plan, sortBy, sortOrder]);

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/admin/delete-user`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteTarget.id }),
      });
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortBy !== col) return <ArrowUp size={12} className="text-white/20" />;
    return sortOrder === "asc" ? (
      <ArrowUp size={12} className="text-[#D7FFA4]" />
    ) : (
      <ArrowDown size={12} className="text-[#D7FFA4]" />
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#051112] text-white font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#051112]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Image src="/new_logo.png" alt="TheShip.ai" width={36} height={36} className="rounded-xl" />
            <div>
              <span className="text-lg font-bold text-white">TheShip</span>
              <span className="text-[#D7FFA4] font-bold">.ai</span>
              <span className="ml-2 rounded-md bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400 border border-red-500/30">
                ADMIN
              </span>
            </div>
          </div>
          <a
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Admin Panel</h1>
          <p className="mt-1 text-sm text-white/50">
            Monitor users, review activity, and manage access.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<Users size={20} className="text-[#D7FFA4]" />}
            label="Total Users"
            value={stats.totalUsers}
            sub={`+${stats.recentUsers} this week`}
            color="bg-[#D7FFA4]/10"
          />
          <StatCard
            icon={<GitPullRequest size={20} className="text-blue-400" />}
            label="Total Reviews"
            value={stats.totalReviews}
            sub="All time PR reviews"
            color="bg-blue-500/10"
          />
          <StatCard
            icon={<ChartBar size={20} className="text-amber-400" />}
            label="Paid Users"
            value={(planBreakdown.starter ?? 0) + (planBreakdown.unlimited ?? 0)}
            sub={`${planBreakdown.unlimited ?? 0} unlimited · ${planBreakdown.starter ?? 0} starter`}
            color="bg-amber-500/10"
          />
          <StatCard
            icon={<UserCircle size={20} className="text-zinc-400" />}
            label="Free Users"
            value={planBreakdown.free ?? 0}
            sub="On free plan"
            color="bg-zinc-500/10"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D7FFA4]/30"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Funnel size={14} className="text-white/40" />
            {(["all", "free", "starter", "unlimited"] as PlanFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlan(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  plan === p
                    ? "bg-[#D7FFA4] text-[#0F2124]"
                    : "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                  <th className="px-5 py-3">User</th>
                  {(
                    [
                      { key: "email", label: "Email" },
                      { key: "subscriptionPlan", label: "Plan" },
                      { key: "prReviewCount", label: "Reviews" },
                      { key: "createdAt", label: "Joined" },
                    ] as { key: SortKey; label: string }[]
                  ).map(({ key, label }) => (
                    <th key={key} className="px-5 py-3">
                      <button
                        onClick={() => toggleSort(key)}
                        className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                      >
                        {label}
                        <SortIcon col={key} />
                      </button>
                    </th>
                  ))}
                  <th className="px-5 py-3">Sessions</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-white/30">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => window.location.href = `/admin/users/${user.id}`}
                      className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {user.image ? (
                            <img
                              src={user.image}
                              alt={user.name}
                              className="size-8 rounded-full object-cover ring-1 ring-white/10"
                            />
                          ) : (
                            <div className="flex size-8 items-center justify-center rounded-full bg-[#D7FFA4]/20 text-xs font-bold text-[#D7FFA4]">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-white truncate max-w-[140px]">
                            {user.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-white/60 max-w-[180px] truncate">{user.email}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${PLAN_COLORS[user.subscriptionPlan] ?? PLAN_COLORS.free}`}>
                          {PLAN_ICON[user.subscriptionPlan]}
                          {user.subscriptionPlan}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 rounded-full bg-[#D7FFA4]/20" style={{ width: "60px" }}>
                            <div
                              className="h-1.5 rounded-full bg-[#D7FFA4]"
                              style={{ width: `${Math.min(100, (user.prReviewCount / 50) * 100)}%` }}
                            />
                          </div>
                          <span className="text-white/80 tabular-nums font-medium">{user.prReviewCount}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-white/50 tabular-nums text-xs">
                        {new Date(user.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-4 text-white/50 tabular-nums">{user.sessionCount}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setDeleteTarget(user)}
                          title="Delete user"
                          className="rounded-lg p-1.5 text-white/20 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all cursor-pointer"
                        >
                          <Trash size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredUsers.length > 0 && (
            <div className="border-t border-white/10 bg-white/[0.02] px-5 py-3 text-xs text-white/30">
              Showing {filteredUsers.length} of {users.length} user{users.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </main>

      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
