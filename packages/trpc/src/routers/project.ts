import { router, protectedProcedure } from "../trpc.js";
import { z } from "zod";
import { prisma } from "@ai-code-reviewer-trpc/database";

export const projectRouter = router({
  list: protectedProcedure
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
        throw new Error("Unauthorized access to workspace projects");
      }

      const projects = await prisma.project.findMany({
        where: { workspaceId: input.workspaceId },
        orderBy: { createdAt: "desc" },
      });

      return projects;
    }),

  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        repoFullName: z.string().min(1),
        branch: z.string().default("main"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: ctx.user.id,
          },
        },
      });

      if (!membership) {
        throw new Error("Unauthorized workspace access");
      }

      const project = await prisma.project.create({
        data: {
          workspaceId: input.workspaceId,
          name: input.name,
          description: input.description ?? null,
          repoFullName: input.repoFullName,
          branch: input.branch,
        },
      });

      return project;
    }),

  get: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          workspace: {
            members: {
              some: { userId: ctx.user.id },
            },
          },
        },
      });

      if (!project) {
        throw new Error("Project not found or access denied");
      }

      return project;
    }),
});
