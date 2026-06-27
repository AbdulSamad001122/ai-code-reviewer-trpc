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
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";

export function CreateProjectDialog({ onProjectCreated }: { onProjectCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repoFullName, setRepoFullName] = useState("");
  const [branch, setBranch] = useState("main");
  const [repoSearch, setRepoSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { activeWorkspace } = useWorkspace();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setRepoSearch("");
    }
  };

  const { data: installStatus } = trpc.github.getInstallationStatus.useQuery();

  const { data: reposData, isLoading: isLoadingRepos } = trpc.github.getRepos.useQuery(
    { page: 1 },
    { enabled: !!installStatus?.connected && open }
  );

  const createProjectMutation = trpc.project.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !name.trim() || !repoFullName || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createProjectMutation.mutateAsync({
        workspaceId: activeWorkspace.id,
        name,
        description: description || undefined,
        repoFullName,
        branch,
      });
      if (onProjectCreated) {
        await onProjectCreated();
      }
      setOpen(false);
      setName("");
      setDescription("");
      setRepoFullName("");
      setBranch("main");
      setRepoSearch("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRepos = reposData?.repos?.filter((repo: any) =>
    repo.fullName.toLowerCase().includes(repoSearch.toLowerCase())
  ) || [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                  <div className="space-y-2">
                    <Combobox
                      value={repoFullName}
                      onValueChange={(val) => {
                        setRepoFullName(val || "");
                        setRepoSearch(val || "");
                        if (val && !name) {
                          const parts = val.split("/");
                          setName(parts[parts.length - 1] || "");
                        }
                      }}
                      inputValue={repoSearch}
                      onInputValueChange={setRepoSearch}
                    >
                      <ComboboxInput
                        placeholder="Search or select a repository..."
                        className="w-full h-10 border-border bg-background"
                        disabled={isSubmitting}
                      />
                      <ComboboxContent className="w-[var(--anchor-width)] max-h-60 overflow-y-auto">
                        <ComboboxList>
                          {filteredRepos.map((repo: any) => (
                            <ComboboxItem
                              key={repo.id}
                              value={repo.fullName}
                              className="cursor-pointer"
                            >
                              {repo.fullName}
                            </ComboboxItem>
                          ))}
                        </ComboboxList>
                        <ComboboxEmpty>No repositories found</ComboboxEmpty>
                      </ComboboxContent>
                    </Combobox>
                  </div>
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
                disabled={isSubmitting}
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
              disabled={isSubmitting}
              className="border-border cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={!name.trim() || !repoFullName}
              className="bg-primary text-primary-foreground cursor-pointer"
            >
              Link Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
