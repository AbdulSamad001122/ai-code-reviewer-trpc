"use client";

import * as React from "react";
import { useWorkspace } from "../context/workspace-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { CaretUpDown, Plus, FolderOpen } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/trpc/trpc";

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, setActiveWorkspace, refetchWorkspaces } = useWorkspace();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [name, setName] = React.useState("");

  const createWorkspaceMutation = trpc.workspace.create.useMutation({
    onSuccess: () => {
      refetchWorkspaces();
      setIsDialogOpen(false);
      setName("");
    },
  });

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createWorkspaceMutation.mutate({ name });
  };

  if (!activeWorkspace) return null;

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <FolderOpen className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {activeWorkspace.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">Active Workspace</span>
                  </div>
                  <CaretUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              }
            />
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg border-border"
              align="start"
              side="bottom"
              sideOffset={4}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Workspaces
                </DropdownMenuLabel>
                {workspaces.map((workspace) => (
                  <DropdownMenuItem
                    key={workspace.id}
                    onClick={() => setActiveWorkspace(workspace.id)}
                    className="gap-2 p-2 cursor-pointer font-medium"
                  >
                    <div className="flex size-6 items-center justify-center rounded-sm bg-accent text-accent-foreground">
                      <FolderOpen className="size-3" />
                    </div>
                    {workspace.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsDialogOpen(true)}
                className="gap-2 p-2 cursor-pointer text-primary"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border border-dashed border-primary">
                  <Plus className="size-3" />
                </div>
                <div className="font-semibold">Create Workspace</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-border bg-card">
          <form onSubmit={handleCreateWorkspace}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Create New Workspace</DialogTitle>
              <DialogDescription>
                Workspaces allow you to manage and isolate different projects, users, and repositories.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="dialog-workspace-name" className="text-sm font-medium">
                  Workspace Name
                </label>
                <Input
                  id="dialog-workspace-name"
                  placeholder="e.g. Acme Corp, Engineering"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={createWorkspaceMutation.isPending}
                  className="border-border bg-background"
                />
              </div>
              {createWorkspaceMutation.isError && (
                <p className="text-sm text-destructive font-medium">
                  {createWorkspaceMutation.error.message || "Failed to create workspace."}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={createWorkspaceMutation.isPending}
                className="border-border cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={createWorkspaceMutation.isPending}
                disabled={!name.trim()}
                className="bg-primary text-primary-foreground cursor-pointer"
              >
                Create Workspace
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
