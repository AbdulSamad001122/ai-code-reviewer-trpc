"use client";

import { useState } from "react";
import { trpc } from "@/trpc/trpc";
import { useWorkspace } from "../context/workspace-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, GitFork } from "@phosphor-icons/react";

export function CreateProjectDialog({ onProjectCreated }: { onProjectCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repoFullName, setRepoFullName] = useState("");
  const [branch, setBranch] = useState("main");

  const { activeWorkspace } = useWorkspace();

  // Fetch GitHub installation status to ensure they are connected
  const { data: installStatus } = trpc.github.getInstallationStatus.useQuery();

  // Fetch repositories for linking
  const { data: reposData, isLoading: isLoadingRepos } = trpc.github.getRepos.useQuery(
    { page: 1 },
    { enabled: !!installStatus?.connected && open }
  );

  const createProjectMutation = trpc.project.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      setName("");
      setDescription("");
      setRepoFullName("");
      setBranch("main");
      if (onProjectCreated) {
        onProjectCreated();
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !name.trim() || !repoFullName || createProjectMutation.isPending) {
      return;
    }

    createProjectMutation.mutate({
      workspaceId: activeWorkspace.id,
      name,
      description: description || undefined,
      repoFullName,
      branch,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="cursor-pointer gap-2 bg-primary text-primary-foreground font-semibold">
            <Plus className="size-4" />
            Create Project
          </Button>
        }
      />
      <DialogContent className="border-border bg-card max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Link New Project</DialogTitle>
            <DialogDescription>
              Connect a GitHub repository to track features, PRDs, and pull requests in this workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="project-name" className="text-sm font-medium">
                Project Name
              </label>
              <Input
                id="project-name"
                placeholder="e.g. Mobile App, E-Commerce API"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={createProjectMutation.isPending}
                className="border-border bg-background"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="project-desc" className="text-sm font-medium">
                Description (Optional)
              </label>
              <Textarea
                id="project-desc"
                placeholder="Describe what this project is about..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={createProjectMutation.isPending}
                className="border-border bg-background min-h-[80px]"
              />
            </div>

            {!installStatus?.connected ? (
              <div className="rounded-lg border border-warning/20 bg-warning/10 p-3 text-sm text-amber-500">
                You must connect your GitHub account via the GitHub App page first to link repositories.
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor="repo-select" className="text-sm font-medium">
                  GitHub Repository
                </label>
                {isLoadingRepos ? (
                  <div className="text-sm text-muted-foreground">Loading repositories…</div>
                ) : !reposData?.repos || reposData.repos.length === 0 ? (
                  <div className="text-sm text-destructive font-medium">
                    No repositories found. Make sure your GitHub App installation is configured for this account.
                  </div>
                ) : (
                  <select
                    id="repo-select"
                    value={repoFullName}
                    onChange={(e) => {
                      setRepoFullName(e.target.value);
                      // Default project name to repo name if empty
                      if (!name) {
                        const parts = e.target.value.split("/");
                        setName(parts[parts.length - 1] || "");
                      }
                    }}
                    required
                    disabled={createProjectMutation.isPending}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="" disabled>Select a repository...</option>
                    {reposData.repos.map((repo: any) => (
                      <option key={repo.id} value={repo.fullName}>
                        {repo.fullName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="project-branch" className="text-sm font-medium">
                Default Target Branch
              </label>
              <Input
                id="project-branch"
                placeholder="main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                required
                disabled={createProjectMutation.isPending}
                className="border-border bg-background"
              />
            </div>

            {createProjectMutation.isError && (
              <p className="text-sm text-destructive font-medium">
                {createProjectMutation.error.message || "Failed to create project."}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createProjectMutation.isPending}
              className="border-border cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !repoFullName || createProjectMutation.isPending}
              className="bg-primary text-primary-foreground cursor-pointer"
            >
              {createProjectMutation.isPending ? "Creating..." : "Link Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
