import { requireAuth } from "@/features/auth/actions";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { WorkspaceShellWrapper } from "@/features/workspace/components/workspace-shell-wrapper";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <WorkspaceShellWrapper>
      <DashboardShell user={session.user} plan="Pro">
        {children}
      </DashboardShell>
    </WorkspaceShellWrapper>
  );
}
