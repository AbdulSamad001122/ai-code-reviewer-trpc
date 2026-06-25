import { router, protectedProcedure } from "../trpc.js";
import { z } from "zod";
import { prisma } from "@ai-code-reviewer-trpc/database";
import { Inngest } from "inngest";

const inngest = new Inngest({ id: "ai-code-reviewer" });

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

      // Find the workspace owner
      const ownerMember = await prisma.workspaceMember.findFirst({
        where: { workspaceId: input.workspaceId, role: "owner" },
        include: { user: true },
      });

      if (ownerMember) {
        const owner = ownerMember.user;
        const isPaid = owner.subscriptionStatus === "active" || owner.subscriptionStatus === "trialing";
        const plan = isPaid ? owner.subscriptionPlan : "free";

        const projectCount = await prisma.project.count({
          where: { workspaceId: input.workspaceId },
        });

        const maxProjects = plan === "unlimited" ? Infinity : (plan === "starter" ? 3 : 1);
        if (projectCount >= maxProjects) {
          throw new Error(`Project limit reached. The current plan only allows up to ${maxProjects} projects in this workspace.`);
        }
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

  delete: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          workspace: {
            members: {
              some: { userId: ctx.user.id, role: "owner" },
            },
          },
        },
      });

      if (!project) {
        throw new Error("Project not found or you are not authorized to delete it (must be workspace owner)");
      }

      let installationId = 0;
      try {
        const ownerMember = await prisma.workspaceMember.findFirst({
          where: { workspaceId: project.workspaceId, role: "owner" },
          include: { user: { include: { githubInstallation: true } } }
        });
        if (ownerMember?.user?.githubInstallation?.installationId) {
          installationId = ownerMember.user.githubInstallation.installationId;
        } else {
          const repoSync = await prisma.repoSync.findUnique({
            where: { repoFullName: project.repoFullName }
          });
          if (repoSync?.installationId) {
            installationId = repoSync.installationId;
          }
        }
      } catch (e) {
        console.error("Failed to find installation ID for project deletion sync:", e);
      }

      if (installationId) {
        try {
          await inngest.send({
            name: "app/project.deleted",
            data: {
              repoFullName: project.repoFullName,
              branch: project.branch,
              installationId,
              name: project.name,
            },
          });
        } catch (error) {
          console.error("Failed to trigger Inngest event for app/project.deleted:", error);
        }
      }

      const deletedProject = await prisma.project.delete({
        where: { id: input.projectId },
      });

      return deletedProject;
    }),
});
