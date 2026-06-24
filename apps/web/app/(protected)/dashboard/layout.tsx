import { requireAuth } from "@/features/auth/actions";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { WorkspaceShellWrapper } from "@/features/workspace/components/workspace-shell-wrapper";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionPlan: true, subscriptionStatus: true },
  });

  const isPaid = dbUser?.subscriptionStatus === "active" || dbUser?.subscriptionStatus === "trialing";
  const plan = isPaid ? (dbUser?.subscriptionPlan || "free") : "free";
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <WorkspaceShellWrapper>
      <DashboardShell user={session.user} plan={planLabel}>
        {children}
      </DashboardShell>
    </WorkspaceShellWrapper>
  );
}
