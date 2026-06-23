"use client";

import { useWorkspace } from "@/features/workspace/context/workspace-context";
import { trpc } from "@/trpc/trpc";
import { CreateProjectDialog } from "@/features/workspace/components/create-project-dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Folder, GitBranch, ArrowRight, Kanban, ChatText, Gear } from "@phosphor-icons/react";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";

export default function Dashboard() {
  const { activeWorkspace } = useWorkspace();

  const {
    data: projects = [],
    isLoading: isLoadingProjects,
    refetch: refetchProjects,
  } = trpc.project.list.useQuery(
    { workspaceId: activeWorkspace?.id ?? "" },
    { enabled: !!activeWorkspace?.id }
  );

  if (!activeWorkspace) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage projects and codebase delivery flows inside <span className="font-semibold text-primary">{activeWorkspace.name}</span>.
          </p>
        </div>
        <CreateProjectDialog onProjectCreated={refetchProjects} />
      </div>

      {isLoadingProjects ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner className="size-8" />
        </div>
      ) : projects.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed border-border bg-card/50">
          <CardContent className="space-y-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Folder className="size-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-foreground">No projects found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Connect and link a GitHub repository to create your first project inside this workspace.
              </p>
            </div>
            <CreateProjectDialog onProjectCreated={refetchProjects} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col border-border bg-card hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground truncate">{project.name}</CardTitle>
                <CardDescription className="line-clamp-2 h-10 text-muted-foreground">
                  {project.description || "No project description provided."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="flex items-center gap-2 rounded-lg bg-accent/40 px-3 py-2 text-xs font-semibold text-muted-foreground border border-border/50">
                  <GitBranch className="size-4 text-primary" />
                  <span className="truncate">{project.repoFullName}</span>
                  <span className="ml-auto text-[10px] bg-accent px-1.5 py-0.5 rounded font-mono">
                    {project.branch}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="grid grid-cols-3 gap-2 border-t border-border pt-4">
                <Link
                  href={`/dashboard/projects/${project.id}/features`}
                  className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground text-[10px] font-semibold gap-1.5 transition-colors"
                >
                  <ChatText className="size-4 text-primary" />
                  Features
                </Link>
                <Link
                  href={`/dashboard/projects/${project.id}/tasks`}
                  className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground text-[10px] font-semibold gap-1.5 transition-colors"
                >
                  <Kanban className="size-4 text-primary" />
                  Kanban Board
                </Link>
                <Link
                  href={`/dashboard/projects/${project.id}/settings`}
                  className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground text-[10px] font-semibold gap-1.5 transition-colors"
                >
                  <Gear className="size-4 text-primary" />
                  Settings
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
