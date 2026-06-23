import { router, protectedProcedure } from "../trpc.js";
import { z } from "zod";
import { prisma } from "@ai-code-reviewer-trpc/database";
import { App } from "octokit";

function getGithubApp() {
  return new App({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    webhooks: {
      secret: process.env.GITHUB_WEBHOOK_SECRET!
    }
  });
}

export const githubRouter = router({
  getInstallationStatus: protectedProcedure.query(async ({ ctx }) => {
    const installation = await prisma.githubInstallation.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!installation) {
      return { connected: false, accountLogin: null, installedAt: null };
    }

    return {
      connected: true,
      accountLogin: installation.accountLogin,
      installedAt: installation.createdAt.toISOString(),
    };
  }),

  disconnectApp: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await prisma.githubInstallation.delete({
        where: { userId: ctx.user.id },
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to delete installation:", error);
      return { success: false };
    }
  }),

  getRepos: protectedProcedure
    .input(
      z.object({
        cursor: z.number().nullish(),
        page: z.number().min(1).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const installation = await prisma.githubInstallation.findUnique({
        where: { userId: ctx.user.id },
        select: { installationId: true },
      });

      if (!installation) {
        throw new Error("GitHub App not connected");
      }

      const installationId = installation.installationId;
      const app = getGithubApp();
      const octokit = await app.getInstallationOctokit(installationId);

      const REPOS_PER_PAGE = 100;
      const currentPage = input.cursor ?? input.page;
      const { data } = await octokit.request("GET /installation/repositories", {
        per_page: REPOS_PER_PAGE,
        page: currentPage,
      });

      const totalCount = data.total_count;
      const mappedRepos = data.repositories.map((repo) => ({
        id: String(repo.id),
        name: repo.name,
        fullName: repo.full_name,
        visibility: repo.private ? ("private" as const) : ("public" as const),
        defaultBranch: repo.default_branch ?? "main",
        updatedAt: repo.updated_at ?? new Date().toISOString(),
        language: repo.language ?? null,
        stars: repo.stargazers_count ?? 0,
      }));

      const repoFullNames = mappedRepos.map((repo) => repo.fullName);
      const syncs = await prisma.repoSync.findMany({
        where: { repoFullName: { in: repoFullNames } },
        select: { repoFullName: true, status: true },
      });

      const statusByRepo: Record<string, string> = {};
      for (const sync of syncs) {
        statusByRepo[sync.repoFullName] = sync.status;
      }

      const repos = mappedRepos.map((repo) => ({
        ...repo,
        syncStatus: (statusByRepo[repo.fullName] as any) ?? null,
      }));

      return {
        repos,
        totalCount,
        page: currentPage,
        hasMore: currentPage * REPOS_PER_PAGE < totalCount,
      };
    }),
});
