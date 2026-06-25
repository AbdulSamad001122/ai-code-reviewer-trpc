import { router, protectedProcedure } from "../trpc.js";
import { z } from "zod";
import { prisma } from "@ai-code-reviewer-trpc/database";
import { Inngest } from "inngest";

const inngest = new Inngest({ id: "ai-code-reviewer" });

export const repoSyncRouter = router({
  sync: protectedProcedure
    .input(
      z.object({
        repoFullName: z.string(),
        branch: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const installation = await prisma.githubInstallation.findUnique({
        where: { userId: ctx.user.id },
        select: { installationId: true },
      });

      if (!installation) {
        throw new Error("GitHub App not connected");
      }

      const installationId = installation.installationId;

      const repoSync = await prisma.repoSync.upsert({
        where: { repoFullName: input.repoFullName },
        create: {
          installationId,
          repoFullName: input.repoFullName,
          branch: input.branch,
          status: "pending",
        },
        update: {
          installationId,
          branch: input.branch,
          status: "pending",
        },
      });

      try {
        await inngest.send({
          name: "repo/sync.requested",
          data: { repoSyncId: repoSync.id },
        });
      } catch (error) {
        console.error("Failed to trigger Inngest event for repo/sync.requested:", error);
      }

      return { success: true, repoSyncId: repoSync.id };
    }),
});
