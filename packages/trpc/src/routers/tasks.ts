import { router, protectedProcedure } from "../trpc.js";
import { z } from "zod";
import { prisma } from "@ai-code-reviewer-trpc/database";
import { Inngest } from "inngest";

const inngest = new Inngest({ id: "ai-code-reviewer" });

export const tasksRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
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

      if (task.prdId) {
        const prd = await prisma.pRD.findUnique({
          where: { id: task.prdId },
          select: { featureRequestId: true },
        });
        if (prd?.featureRequestId) {
          try {
            await inngest.send({
              name: "app/git_sync.requested",
              data: { featureId: prd.featureRequestId },
            });
          } catch (error) {
            console.error("Failed to trigger Inngest event for app/git_sync.requested during task creation:", error);
          }
        }
      }

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

      if (updatedTask.prdId) {
        const prd = await prisma.pRD.findUnique({
          where: { id: updatedTask.prdId },
          select: { featureRequestId: true },
        });
        if (prd?.featureRequestId) {
          try {
            await inngest.send({
              name: "app/git_sync.requested",
              data: { featureId: prd.featureRequestId },
            });
          } catch (error) {
            console.error("Failed to trigger Inngest event for app/git_sync.requested during status update:", error);
          }
        }
      }

      return updatedTask;
    }),

  delete: protectedProcedure
    .input(z.object({ taskId: z.string() }))
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

      const deletedTask = await prisma.task.delete({
        where: { id: input.taskId },
      });

      if (deletedTask.prdId) {
        const prd = await prisma.pRD.findUnique({
          where: { id: deletedTask.prdId },
          select: { featureRequestId: true },
        });
        if (prd?.featureRequestId) {
          try {
            await inngest.send({
              name: "app/git_sync.requested",
              data: { featureId: prd.featureRequestId },
            });
          } catch (error) {
            console.error("Failed to trigger Inngest event for app/git_sync.requested during task deletion:", error);
          }
        }
      }

      return deletedTask;
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
