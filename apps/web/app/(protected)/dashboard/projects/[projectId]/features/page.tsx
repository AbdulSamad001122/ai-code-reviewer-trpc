"use client";

import { use, useState } from "react";
import { trpc } from "@/trpc/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, ChatText, ArrowRight, Kanban, GitCommit } from "@phosphor-icons/react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Spinner } from "@/components/ui/spinner";

function getStatusColor(status: string) {
  switch (status) {
    case "discovery":
      return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
    case "prd_generation":
      return "bg-purple-500/10 text-purple-500 border border-purple-500/20";
    case "planning":
      return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
    case "development":
      return "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20";
    case "ready_for_review":
      return "bg-pink-500/10 text-pink-500 border border-pink-500/20";
    case "ready_for_release":
      return "bg-cyan-500/10 text-cyan-500 border border-cyan-500/20";
    case "shipped":
      return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
    default:
      return "bg-muted text-muted-foreground border border-muted-foreground/20";
  }
}

export default function FeaturesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: project, isLoading: isLoadingProject } = trpc.project.get.useQuery({ projectId });

  const {
    data: features = [],
    isLoading: isLoadingFeatures,
    refetch: refetchFeatures,
  } = trpc.features.list.useQuery({ projectId });

  const createFeatureMutation = trpc.features.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      setTitle("");
      setDescription("");
      refetchFeatures();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || createFeatureMutation.isPending) {
      return;
    }
    createFeatureMutation.mutate({
      projectId,
      title,
      description,
    });
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

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Feature Requests</h1>
          <p className="text-sm text-muted-foreground">
            Manage requirements, AI clarifications, and PRD specifications for{" "}
            <span className="font-semibold text-primary">{project.name}</span>.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button className="cursor-pointer gap-2 bg-primary text-primary-foreground font-semibold">
                <Plus className="size-4" />
                New Feature
              </Button>
            }
          />
          <DialogContent className="border-border bg-card max-w-lg">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Submit Feature Request</DialogTitle>
                <DialogDescription>
                  Explain the goals and user story for this feature. The AI product agent will help clarify it.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="feature-title" className="text-sm font-medium">
                    Feature Title
                  </label>
                  <Input
                    id="feature-title"
                    placeholder="e.g. Add Multi-Currency Support"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    disabled={createFeatureMutation.isPending}
                    className="border-border bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="feature-desc" className="text-sm font-medium">
                    Initial Description
                  </label>
                  <Textarea
                    id="feature-desc"
                    placeholder="Provide a high-level summary of what this feature should accomplish, why users need it, and how it should behave..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    disabled={createFeatureMutation.isPending}
                    className="border-border bg-background min-h-[120px]"
                  />
                </div>

                {createFeatureMutation.isError && (
                  <p className="text-sm text-destructive font-medium">
                    {createFeatureMutation.error.message || "Failed to submit request."}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={createFeatureMutation.isPending}
                  className="border-border cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!title.trim() || !description.trim() || createFeatureMutation.isPending}
                  className="bg-primary text-primary-foreground cursor-pointer"
                >
                  {createFeatureMutation.isPending ? "Submitting..." : "Start Discovery"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoadingFeatures ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Spinner className="size-8" />
        </div>
      ) : features.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed border-border bg-card/50">
          <CardContent className="space-y-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <ChatText className="size-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-foreground">No features submitted yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Initiate a feature request. Our AI agent will help you discover goals and auto-compile a PRD.
              </p>
            </div>
            <Button
              onClick={() => setOpen(true)}
              className="cursor-pointer gap-2 bg-primary text-primary-foreground font-semibold"
            >
              <Plus className="size-4" />
              Submit First Feature
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature Request</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((feature) => (
                <TableRow key={feature.id}>
                  <TableCell>
                    <div className="flex flex-col max-w-md">
                      <span className="font-semibold text-foreground truncate">{feature.title}</span>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {feature.description}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${getStatusColor(feature.status)}`}>
                      {feature.status.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground text-sm">
                    {feature.source.replace("_", " ")}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(feature.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      render={
                        <Link href={`/dashboard/projects/${projectId}/features/${feature.id}`} className="gap-1">
                          Open
                          <ArrowRight className="size-3" />
                        </Link>
                      }
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer text-primary hover:text-primary/95"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
