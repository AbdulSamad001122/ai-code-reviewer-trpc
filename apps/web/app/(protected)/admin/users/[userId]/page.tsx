import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { UserDetailClient } from "./user-detail-client";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      sessions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      githubInstallation: true,
      workspaceMembers: {
        include: {
          workspace: {
            include: {
              projects: {
                include: {
                  featureRequests: {
                    include: {
                      chatMessages: {
                        orderBy: { createdAt: "asc" },
                      },
                      prd: true,
                      pullRequests: {
                        orderBy: { createdAt: "desc" },
                      },
                      _count: {
                        select: { chatMessages: true },
                      },
                    },
                    orderBy: { createdAt: "desc" },
                  },
                  tasks: {
                    orderBy: { createdAt: "desc" },
                  },
                  _count: {
                    select: { featureRequests: true, tasks: true },
                  },
                },
              },
              _count: { select: { projects: true } },
            },
          },
        },
      },
    },
  });

  if (!user) notFound();

  // Compute total AI chat messages across all features (token usage proxy)
  let totalAiMessages = 0;
  let totalUserMessages = 0;

  for (const member of user.workspaceMembers) {
    for (const project of member.workspace.projects) {
      for (const feature of project.featureRequests) {
        for (const msg of feature.chatMessages) {
          if (msg.sender === "ai") totalAiMessages++;
          else totalUserMessages++;
        }
      }
    }
  }

  return (
    <UserDetailClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        prReviewCount: user.prReviewCount,
        renewsAt: user.renewsAt,
        githubLogin: user.githubInstallation?.accountLogin ?? null,
        sessions: user.sessions.map((s) => ({
          id: s.id,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          ipAddress: s.ipAddress,
          userAgent: s.userAgent,
        })),
        workspaces: user.workspaceMembers.map((m) => ({
          id: m.workspace.id,
          name: m.workspace.name,
          role: m.role,
          createdAt: m.workspace.createdAt,
          projectCount: m.workspace._count.projects,
          projects: m.workspace.projects.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            repoFullName: p.repoFullName,
            branch: p.branch,
            createdAt: p.createdAt,
            featureCount: p._count.featureRequests,
            taskCount: p._count.tasks,
            tasks: p.tasks.map((t) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              createdAt: t.createdAt,
            })),
            features: p.featureRequests.map((f) => ({
              id: f.id,
              title: f.title,
              status: f.status,
              createdAt: f.createdAt,
              chatMessageCount: f._count.chatMessages,
              hasPrd: !!f.prd,
              pullRequestCount: f.pullRequests.length,
              pullRequests: f.pullRequests.map((pr) => ({
                id: pr.id,
                title: pr.title,
                prNumber: pr.prNumber,
                repoFullName: pr.repoFullName,
                status: pr.status,
                createdAt: pr.createdAt,
              })),
              chatMessages: f.chatMessages.map((c) => ({
                id: c.id,
                sender: c.sender,
                message: c.message,
                createdAt: c.createdAt,
              })),
            })),
          })),
        })),
        totalAiMessages,
        totalUserMessages,
      }}
    />
  );
}
