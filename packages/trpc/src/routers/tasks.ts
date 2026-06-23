import { router, protectedProcedure } from "../trpc.js";
import { z } from "zod";
import { prisma } from "@ai-code-reviewer-trpc/database";

export const tasksRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Validate project access
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        select: { workspaceId: true },
      });

      if (!project) {
        throw new Error("Project not found");
      }

      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: project.workspaceId,
            userId: ctx.user.id,
          },
        },
      });

      if (!membership) {
        throw new Error("Unauthorized workspace access");
      }

      const tasks = await prisma.task.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "asc" },
      });

      return tasks;
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        prdId: z.string().optional().nullable(),
        title: z.string().min(1),
        description: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate project access
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        select: { workspaceId: true },
      });

      if (!project) {
        throw new Error("Project not found");
      }

      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: project.workspaceId,
            userId: ctx.user.id,
          },
        },
      });

      if (!membership) {
        throw new Error("Unauthorized workspace access");
      }

      const task = await prisma.task.create({
        data: {
          projectId: input.projectId,
          prdId: input.prdId ?? null,
          title: input.title,
          description: input.description ?? null,
          status: "todo",
        },
      });

      return task;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        status: z.enum(["todo", "in_progress", "review", "done"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
        include: {
          project: {
            select: { workspaceId: true },
          },
        },
      });

      if (!task) {
        throw new Error("Task not found");
      }

      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: task.project.workspaceId,
            userId: ctx.user.id,
          },
        },
      });

      if (!membership) {
        throw new Error("Unauthorized workspace access");
      }

      const updatedTask = await prisma.task.update({
        where: { id: input.taskId },
        data: { status: input.status },
      });

      return updatedTask;
    }),

  approvePlan: protectedProcedure
    .input(z.object({ featureId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const feature = await prisma.featureRequest.findUnique({
        where: { id: input.featureId },
        include: {
          project: {
            select: { workspaceId: true },
          },
        },
      });

      if (!feature) {
        throw new Error("Feature request not found");
      }

      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: feature.project.workspaceId,
            userId: ctx.user.id,
          },
        },
      });

      if (!membership) {
        throw new Error("Unauthorized workspace access");
      }

      if (feature.status !== "planning") {
        throw new Error("Feature request is not in the planning phase");
      }

      const updatedFeature = await prisma.featureRequest.update({
        where: { id: input.featureId },
        data: { status: "development" },
      });

      // Log an AI status message in the chat
      await prisma.featureRequestChat.create({
        data: {
          featureRequestId: input.featureId,
          sender: "ai",
          message: "Planning approved! We have officially entered the **development** phase. Developers/coding agents can now implement the code changes and create a pull request linking back to this feature request.",
        },
      });

      return updatedFeature;
    }),
});
