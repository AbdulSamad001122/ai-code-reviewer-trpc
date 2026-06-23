"use client";

import { WorkspaceProvider, useWorkspace } from "../context/workspace-context";
import { CreateWorkspaceOverlay } from "./create-workspace-overlay";
import { Spinner } from "@/components/ui/spinner";

function WorkspaceOnboardingCheck({ children }: { children: React.ReactNode }) {
  const { workspaces, isLoading } = useWorkspace();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return <CreateWorkspaceOverlay />;
  }

  return <>{children}</>;
}

export function WorkspaceShellWrapper({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <WorkspaceOnboardingCheck>{children}</WorkspaceOnboardingCheck>
    </WorkspaceProvider>
  );
}
