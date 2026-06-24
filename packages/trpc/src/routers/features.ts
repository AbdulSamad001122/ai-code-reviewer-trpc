import { router, protectedProcedure } from "../trpc.js";
import { z } from "zod";
import { prisma } from "@ai-code-reviewer-trpc/database";
import { Inngest } from "inngest";

const inngest = new Inngest({ id: "ai-code-reviewer" });

export const featuresRouter = router({
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

      const features = await prisma.featureRequest.findMany({
        where: { projectId: input.projectId },
        include: { prd: true },
        orderBy: { createdAt: "desc" },
      });

      return features;
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().min(1),
        description: z.string().min(1),
        source: z.enum(["web_form", "email", "support"]).default("web_form"),
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

      const feature = await prisma.featureRequest.create({
        data: {
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          source: input.source,
          status: "discovery",
        },
      });

      await inngest.send({
        name: "app/feature.created",
        data: {
          featureRequestId: feature.id,
          projectId: input.projectId,
        },
      });

      return feature;
    }),

  get: protectedProcedure
    .input(z.object({ featureId: z.string() }))
    .query(async ({ ctx, input }) => {
      const feature = await prisma.featureRequest.findUnique({
        where: { id: input.featureId },
        include: {
          prd: true,
          pullRequests: true,
          project: {
            select: {
              workspaceId: true,
              repoFullName: true,
              branch: true,
              tasks: true,
            },
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

      return feature;
    }),

  getChat: protectedProcedure
    .input(z.object({ featureId: z.string() }))
    .query(async ({ ctx, input }) => {
      const feature = await prisma.featureRequest.findUnique({
        where: { id: input.featureId },
        select: { project: { select: { workspaceId: true } } },
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

      const chat = await prisma.featureRequestChat.findMany({
        where: { featureRequestId: input.featureId },
        orderBy: { createdAt: "asc" },
      });

      return chat;
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        featureId: z.string(),
        message: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const feature = await prisma.featureRequest.findUnique({
        where: { id: input.featureId },
        select: { project: { select: { workspaceId: true } }, status: true },
      });

      if (!feature) {
        throw new Error("Feature request not found");
      }

      if (feature.status !== "discovery") {
        throw new Error("Cannot send messages when not in discovery phase");
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

      const chatMessage = await prisma.featureRequestChat.create({
        data: {
          featureRequestId: input.featureId,
          sender: "user",
          message: input.message,
        },
      });

      await inngest.send({
        name: "app/feature.chat_received",
        data: {
          featureRequestId: input.featureId,
        },
      });

      return chatMessage;
    }),

  approveRelease: protectedProcedure
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

      const updatedFeature = await prisma.featureRequest.update({
        where: { id: input.featureId },
        data: { status: "shipped" },
      });

      await prisma.featureRequestChat.create({
        data: {
          featureRequestId: input.featureId,
          sender: "ai",
          message: "🎉 **Release Approved!** Human reviewer has approved the release. The feature request is officially marked as **Shipped** to production!",
        },
      });

      return updatedFeature;
    }),

  rejectRelease: protectedProcedure
    .input(
      z.object({
        featureId: z.string(),
        reason: z.string().optional(),
      })
    )
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

      const statusToSet = input.reason ? "prd_generation" : "development";

      const updatedFeature = await prisma.featureRequest.update({
        where: { id: input.featureId },
        data: { status: statusToSet },
      });

      const messageContent = input.reason
        ? `🚨 **Release Rejected.** Human reviewer has rejected the release and sent it back to development.\n\n**Reason:**\n${input.reason}\n\n*AI PM is revising the PRD and generating new engineering tasks...*`
        : `🚨 **Release Rejected.** Human reviewer has rejected the release and sent it back to development. Please review the implementation and address outstanding issues.`;

      await prisma.featureRequestChat.create({
        data: {
          featureRequestId: input.featureId,
          sender: "ai",
          message: messageContent,
        },
      });

      if (input.reason) {
        await inngest.send({
          name: "app/feature.release_rejected",
          data: {
            featureRequestId: input.featureId,
            reason: input.reason,
          },
        });
      }

      return updatedFeature;
    }),
});
