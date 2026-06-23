"use client";

import { use, useState } from "react";
import { trpc } from "@/trpc/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Kanban,
  CheckCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  DotsThreeOutlineVertical,
  Warning,
  Play,
} from "@phosphor-icons/react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

type TaskStatus = "todo" | "in_progress" | "review" | "done";

interface Column {
  id: TaskStatus;
  title: string;
  color: string;
  icon: React.ReactNode;
}

export default function KanbanPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPrdId, setSelectedPrdId] = useState<string>("none");

  // Fetch project details
  const { data: project, isLoading: isLoadingProject } = trpc.project.get.useQuery({ projectId });

  // Fetch features
  const {
    data: features = [],
    isLoading: isLoadingFeatures,
    refetch: refetchFeatures,
  } = trpc.features.list.useQuery({ projectId });

  // Fetch tasks
  const {
    data: tasks = [],
    isLoading: isLoadingTasks,
    refetch: refetchTasks,
  } = trpc.tasks.list.useQuery({ projectId });

  // Create task mutation
  const createTaskMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      setTitle("");
      setDescription("");
      setSelectedPrdId("none");
      refetchTasks();
    },
  });

  // Update status mutation
  const updateStatusMutation = trpc.tasks.updateStatus.useMutation({
    onSuccess: () => {
      refetchTasks();
    },
  });

  // Approve plan mutation
  const approvePlanMutation = trpc.tasks.approvePlan.useMutation({
    onSuccess: () => {
      refetchFeatures();
      refetchTasks();
    },
  });

  // Filter features that are in the planning stage
  const planningFeatures = features.filter((f) => f.status === "planning");

  // Features available for linking (must have a PRD generated)
  const prdLinkedFeatures = features.filter((f) => f.prd !== null && f.prd !== undefined);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || createTaskMutation.isPending) return;

    createTaskMutation.mutate({
      projectId,
      title: title.trim(),
      description: description.trim() || null,
      prdId: selectedPrdId === "none" ? null : selectedPrdId,
    });
  };

  const handleUpdateStatus = (taskId: string, status: TaskStatus) => {
    updateStatusMutation.mutate({ taskId, status });
  };

  const handleApprovePlan = (featureId: string) => {
    approvePlanMutation.mutate({ featureId });
  };

  if (isLoadingProject || isLoadingFeatures || isLoadingTasks) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 min-h-[400px]">
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

  const columns: Column[] = [
    {
      id: "todo",
      title: "Todo",
      color: "border-t-slate-400 bg-slate-500/5",
      icon: <Clock className="size-4 text-slate-400" />,
    },
    {
      id: "in_progress",
      title: "In Progress",
      color: "border-t-blue-500 bg-blue-500/5",
      icon: <Play className="size-4 text-blue-500 animate-pulse" />,
    },
    {
      id: "review",
      title: "In Review",
      color: "border-t-purple-500 bg-purple-500/5",
      icon: <Warning className="size-4 text-purple-500" />,
    },
    {
      id: "done",
      title: "Done",
      color: "border-t-emerald-500 bg-emerald-500/5",
      icon: <CheckCircle className="size-4 text-emerald-500" />,
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href={`/dashboard/projects/${projectId}/features`}
            className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <ArrowLeft className="size-3" />
            Back to Feature Requests
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Kanban className="size-8 text-primary" />
            AI Task Board
          </h1>
          <p className="text-sm text-muted-foreground">
            Development timeline and Kanban board for project{" "}
            <span className="font-semibold text-primary">{project.name}</span>.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button className="cursor-pointer gap-2 bg-primary text-primary-foreground font-semibold">
                <Plus className="size-4" />
                New Task
              </Button>
            }
          />
          <DialogContent className="border-border bg-card max-w-lg">
            <form onSubmit={handleCreateTask}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Create Kanban Task</DialogTitle>
                <DialogDescription>
                  Add a manual task to your project timeline. You can optionally link it to a feature requirement specification.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="task-title" className="text-sm font-medium">
                    Task Title
                  </label>
                  <Input
                    id="task-title"
                    placeholder="e.g. Set up API endpoints for billing"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    disabled={createTaskMutation.isPending}
                    className="border-border bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="task-desc" className="text-sm font-medium">
                    Description (Optional)
                  </label>
                  <Textarea
                    id="task-desc"
                    placeholder="Detail the technical specifications or requirements..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={createTaskMutation.isPending}
                    className="border-border bg-background min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="linked-prd" className="text-sm font-medium">
                    Link to Feature PRD (Optional)
                  </label>
                  <select
                    id="linked-prd"
                    value={selectedPrdId}
                    onChange={(e) => setSelectedPrdId(e.target.value)}
                    disabled={createTaskMutation.isPending}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="none">General Project Task (No Link)</option>
                    {prdLinkedFeatures.map((f) => (
                      <option key={f.id} value={f.prd?.id}>
                        {f.title}
                      </option>
                    ))}
                  </select>
                </div>

                {createTaskMutation.isError && (
                  <p className="text-sm text-destructive font-medium">
                    {createTaskMutation.error.message || "Failed to create task."}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={createTaskMutation.isPending}
                  className="border-border cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!title.trim() || createTaskMutation.isPending}
                  className="bg-primary text-primary-foreground cursor-pointer"
                >
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Planning Stage Banner Alert */}
      {planningFeatures.length > 0 && (
        <div className="flex flex-col gap-4">
          {planningFeatures.map((feature) => (
            <Alert
              key={feature.id}
              className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 gap-4"
            >
              <div className="flex gap-3">
                <Warning className="size-6 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <AlertTitle className="font-bold text-base">Plan Ready for Approval</AlertTitle>
                  <AlertDescription className="text-sm text-muted-foreground">
                    AI PM completed requirement specifications and task list for{" "}
                    <span className="font-semibold text-foreground">{feature.title}</span>. Review the Kanban board below, and approve to initiate coding development.
                  </AlertDescription>
                </div>
              </div>
              <Button
                onClick={() => handleApprovePlan(feature.id)}
                disabled={approvePlanMutation.isPending}
                className="cursor-pointer bg-amber-600 text-white hover:bg-amber-700 font-semibold shadow-xs shrink-0 self-stretch sm:self-auto text-center"
              >
                {approvePlanMutation.isPending ? "Processing..." : "Approve Plan & Start Development"}
              </Button>
            </Alert>
          ))}
        </div>
      )}

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-1 items-start">
        {columns.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.id);

          return (
            <div
              key={column.id}
              className={`rounded-xl border border-border border-t-2 ${column.color} flex flex-col p-4 gap-4 min-h-[500px] shadow-xs`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <div className="flex items-center gap-2">
                  {column.icon}
                  <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
                    {column.title}
                  </h3>
                </div>
                <Badge variant="secondary" className="px-2 py-0.5 text-xs font-semibold">
                  {columnTasks.length}
                </Badge>
              </div>

              {/* Task Cards List */}
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[600px] pr-1">
                {columnTasks.length === 0 ? (
                  <div className="text-center py-12 text-xs text-muted-foreground/60 border border-dashed border-border/40 rounded-lg bg-card/10 select-none">
                    No tasks in this stage
                  </div>
                ) : (
                  columnTasks.map((task) => {
                    // Match task to feature request via prd relation if exists
                    const matchedFeature = features.find((f) => f.prd?.id === task.prdId);

                    return (
                      <Card
                        key={task.id}
                        className="border-border bg-card shadow-xs hover:shadow-md transition-shadow duration-200 group relative overflow-hidden"
                      >
                        <CardHeader className="p-3 pb-1.5 flex flex-row items-start justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            <CardTitle className="text-sm font-semibold text-foreground leading-snug">
                              {task.title}
                            </CardTitle>
                            {matchedFeature && (
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-1.5 border-primary/20 text-primary font-medium"
                              >
                                {matchedFeature.title}
                              </Badge>
                            )}
                          </div>

                          {/* Quick Action Transition Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-0"
                                />
                              }
                            >
                              <DotsThreeOutlineVertical weight="fill" className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="border-border bg-card">
                              {column.id !== "todo" && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(task.id, "todo")}
                                  className="cursor-pointer gap-1.5"
                                >
                                  <Clock className="size-3.5 text-muted-foreground" />
                                  Move to Todo
                                </DropdownMenuItem>
                              )}
                              {column.id !== "in_progress" && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(task.id, "in_progress")}
                                  className="cursor-pointer gap-1.5"
                                >
                                  <Play className="size-3.5 text-muted-foreground" />
                                  Move to In Progress
                                </DropdownMenuItem>
                              )}
                              {column.id !== "review" && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(task.id, "review")}
                                  className="cursor-pointer gap-1.5"
                                >
                                  <Warning className="size-3.5 text-muted-foreground" />
                                  Move to Review
                                </DropdownMenuItem>
                              )}
                              {column.id !== "done" && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateStatus(task.id, "done")}
                                  className="cursor-pointer gap-1.5"
                                >
                                  <CheckCircle className="size-3.5 text-muted-foreground" />
                                  Move to Done
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 text-xs text-muted-foreground space-y-2">
                          {task.description && (
                            <p className="line-clamp-2 leading-relaxed">{task.description}</p>
                          )}
                          <div className="text-[10px] text-muted-foreground/60 flex items-center justify-between border-t border-border/30 pt-1.5 mt-1">
                            <span>
                              Added {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
