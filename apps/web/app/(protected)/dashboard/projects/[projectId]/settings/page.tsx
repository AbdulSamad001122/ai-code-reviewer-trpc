"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash, ArrowLeft, GitBranch, Folder } from "@phosphor-icons/react";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";

export default function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const { data: project, isLoading: isLoadingProject } = trpc.project.get.useQuery({ projectId });

  const deleteProjectMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      router.push("/dashboard");
      router.refresh();
    },
  });

  const handleDelete = () => {
    if (deleteConfirmationText !== project?.name) {
      return;
    }
    deleteProjectMutation.mutate({ projectId });
  };

  if (isLoadingProject) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-destructive font-medium">
        Project not found.
      </div>
    );
  }

  const isDeleteDisabled = deleteConfirmationText !== project.name || deleteProjectMutation.isPending;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Back button and title */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/projects/${projectId}/features`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Project Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure integrations and manage workspace settings for <span className="font-semibold text-primary">{project.name}</span>.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Repository connection card */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold">General Details</CardTitle>
            <CardDescription>
              Basic information and linked repository details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Name</label>
              <div className="text-sm font-semibold text-foreground px-3 py-2 bg-accent/30 rounded-md border border-border/50">
                {project.name}
              </div>
            </div>
            {project.description && (
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                <div className="text-sm text-muted-foreground px-3 py-2 bg-accent/30 rounded-md border border-border/50">
                  {project.description}
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Connected Git Repository</label>
              <div className="flex items-center gap-3 px-3 py-2 bg-accent/40 rounded-md border border-border">
                <GitBranch className="size-5 text-primary" />
                <span className="text-sm font-medium text-foreground">{project.repoFullName}</span>
                <span className="ml-auto text-xs bg-accent px-2 py-0.5 rounded font-mono border border-border/50">
                  {project.branch}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone card */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible destructive actions. Please proceed with caution.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border border-destructive/20 bg-destructive/10">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">Delete Project</h4>
                <p className="text-xs text-muted-foreground max-w-md">
                  Permanently delete this project, its feature requirements, Kanban tasks, implementation guides, and all associated chat logs. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                className="w-full sm:w-auto font-bold shrink-0 cursor-pointer"
                onClick={() => setIsConfirmOpen(true)}
              >
                <Trash className="size-4 mr-2" />
                Delete Project
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={(val) => {
        setIsConfirmOpen(val);
        if (!val) setDeleteConfirmationText("");
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive font-bold flex items-center gap-2">
              <Trash className="size-5" />
              Confirm Project Deletion
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action is permanent and cannot be rolled back. To confirm, please type the exact project name <span className="font-semibold text-foreground bg-accent px-1.5 py-0.5 rounded border border-border/40">"{project.name}"</span> below.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <input
              type="text"
              placeholder="Type project name to confirm..."
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              className="w-full bg-accent/40 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-destructive/40 transition-colors"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmOpen(false);
                setDeleteConfirmationText("");
              }}
              disabled={deleteProjectMutation.isPending}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleteDisabled}
              className="font-bold cursor-pointer"
            >
              {deleteProjectMutation.isPending ? (
                <>
                  <Spinner className="size-3.5 mr-2" />
                  Deleting...
                </>
              ) : (
                "Permanently Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
