"use client";

import { useState } from "react";
import { trpc } from "@/trpc/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useWorkspace } from "../context/workspace-context";

export function CreateWorkspaceOverlay() {
  const [name, setName] = useState("");
  const { refetchWorkspaces } = useWorkspace();
  const createWorkspaceMutation = trpc.workspace.create.useMutation({
    onSuccess: () => {
      refetchWorkspaces();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || createWorkspaceMutation.isPending) {
      return;
    }
    createWorkspaceMutation.mutate({ name });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md border-border bg-card shadow-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">Create Workspace</CardTitle>
            <CardDescription>
              Every project and feature request in TheShip AI belongs to a workspace. Set up your workspace to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="workspace-name" className="text-sm font-medium leading-none text-foreground">
                Workspace Name
              </label>
              <Input
                id="workspace-name"
                placeholder="e.g. Acme Corp, My Startup"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={createWorkspaceMutation.isPending}
                className="w-full border-border bg-background"
                autoFocus
              />
            </div>
            {createWorkspaceMutation.isError && (
              <p className="text-sm text-destructive font-medium">
                {createWorkspaceMutation.error.message || "Failed to create workspace. Please try again."}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              loading={createWorkspaceMutation.isPending}
              disabled={!name.trim()}
            >
              Create Workspace
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
