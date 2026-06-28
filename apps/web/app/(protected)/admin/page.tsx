import { prisma } from "@/lib/db";
import { AdminDashboard } from "./admin-dashboard";

export default async function AdminPage() {
  // Fetch all users directly from the database (layout already guards admin access)
  const [users, totalReviews, planBreakdown, recentUsers] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        prReviewCount: true,
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.aggregate({ _sum: { prReviewCount: true } }),
    prisma.user.groupBy({
      by: ["subscriptionPlan"],
      _count: { _all: true },
    }),
    prisma.user.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const formattedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    createdAt: u.createdAt,
    subscriptionPlan: u.subscriptionPlan,
    subscriptionStatus: u.subscriptionStatus,
    prReviewCount: u.prReviewCount,
    sessionCount: u._count.sessions,
  }));

  const stats = {
    totalUsers: users.length,
    totalReviews: totalReviews._sum.prReviewCount ?? 0,
    recentUsers,
    planBreakdown: planBreakdown.map((p) => ({
      subscriptionPlan: p.subscriptionPlan,
      count: p._count._all,
    })),
  };

  return <AdminDashboard initialUsers={formattedUsers} stats={stats} />;
}
