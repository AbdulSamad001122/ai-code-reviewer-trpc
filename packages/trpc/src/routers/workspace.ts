import { router, protectedProcedure } from "../trpc.js";
import { z } from "zod";
import { prisma } from "@ai-code-reviewer-trpc/database";

export const workspaceRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: { userId: ctx.user.id },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return workspaces;
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await prisma.workspace.create({
        data: {
          name: input.name,
          members: {
            create: {
              userId: ctx.user.id,
              role: "owner",
            },
          },
        },
      });

      return workspace;
    }),

  getMembers: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: ctx.user.id,
          },
        },
      });

      if (!membership) {
        throw new Error("Unauthorized access to workspace members");
      }

      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: input.workspaceId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      return members;
    }),
});
