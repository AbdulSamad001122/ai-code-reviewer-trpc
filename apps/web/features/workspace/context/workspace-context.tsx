"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { trpc } from "@/trpc/trpc";

export type Workspace = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceContextType = {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspaceId: string) => void;
  isLoading: boolean;
  refetchWorkspaces: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { data: workspaces = [], isLoading, refetch } = trpc.workspace.list.useQuery();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("shipflow_active_workspace_id");
    if (saved) {
      setActiveWorkspaceId(saved);
    }
  }, []);

  useEffect(() => {
    if (workspaces.length > 0) {
      if (!activeWorkspaceId || !workspaces.some((w) => w.id === activeWorkspaceId)) {
        const defaultId = workspaces[0].id;
        setActiveWorkspaceId(defaultId);
        localStorage.setItem("shipflow_active_workspace_id", defaultId);
      }
    } else {
      setActiveWorkspaceId(null);
    }
  }, [workspaces, activeWorkspaceId]);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;

  const setActiveWorkspace = (id: string) => {
    setActiveWorkspaceId(id);
    localStorage.setItem("shipflow_active_workspace_id", id);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces: workspaces as any,
        activeWorkspace: activeWorkspace as any,
        setActiveWorkspace,
        isLoading,
        refetchWorkspaces: refetch,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
