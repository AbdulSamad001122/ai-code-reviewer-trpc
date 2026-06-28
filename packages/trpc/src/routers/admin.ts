import { router, protectedProcedure } from "../trpc.js";
import { prisma } from "@ai-code-reviewer-trpc/database";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "abdulsamad.dev01@gmail.com";

/** Middleware: only the admin email can call these procedures */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.email !== ADMIN_EMAIL) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access only.",
    });
  }
  return next({ ctx });
});

export const adminRouter = router({
  /** Get all users with their stats */
  getUsers: adminProcedure
    .input(
      z.object({
        sortBy: z
          .enum(["createdAt", "prReviewCount", "name", "email", "subscriptionPlan"])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        search: z.string().optional(),
        plan: z.enum(["all", "free", "starter", "unlimited"]).default("all"),
      })
    )
    .query(async ({ input }) => {
      const { sortBy, sortOrder, search, plan } = input;

      const users = await prisma.user.findMany({
        where: {
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
          ...(plan !== "all" ? { subscriptionPlan: plan } : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          prReviewCount: true,
          renewsAt: true,
          _count: {
            select: { sessions: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
      });

      return users;
    }),

  /** Aggregate stats for the dashboard cards */
  getStats: adminProcedure.query(async (): Promise<{
    totalUsers: number;
    totalReviews: number;
    planBreakdown: { subscriptionPlan: string; _count: { _all: number } }[];
    recentUsers: number;
  }> => {
    const [totalUsers, totalReviews, planBreakdown, recentUsers] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.aggregate({ _sum: { prReviewCount: true } }),
        prisma.user.groupBy({
          by: ["subscriptionPlan"],
          _count: { _all: true },
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

    return {
      totalUsers,
      totalReviews: totalReviews._sum.prReviewCount ?? 0,
      planBreakdown: planBreakdown.map((p) => ({
        subscriptionPlan: p.subscriptionPlan,
        _count: { _all: p._count._all },
      })),
      recentUsers,
    };
  }),

  /** Delete / ban a user by ID */
  deleteUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot delete your own account.",
        });
      }
      await prisma.user.delete({ where: { id: input.userId } });
      return { success: true };
    }),
});
