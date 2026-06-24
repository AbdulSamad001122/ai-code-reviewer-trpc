"use client";

import { use, useState, useEffect, useRef } from "react";
import { trpc } from "@/trpc/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChatText,
  FileText,
  PaperPlaneRight,
  GitBranch,
  Warning,
  CheckCircle,
  Clock,
  ArrowLeft,
  Kanban,
  GitCommit,
  GitPullRequest,
  Check,
  X,
  ArrowSquareOut,
  Sparkle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Spinner } from "@/components/ui/spinner";

function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");

  return (
    <div className="space-y-4 text-foreground leading-relaxed text-sm">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={idx} className="text-2xl font-bold border-b border-border pb-2 pt-4 text-foreground">
              {trimmed.substring(2)}
            </h1>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={idx} className="text-xl font-semibold border-b border-border/50 pb-1 pt-3 text-foreground">
              {trimmed.substring(3)}
            </h2>
          );
        }
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-lg font-medium pt-2 text-foreground">
              {trimmed.substring(4)}
            </h3>
          );
        }

        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          return (
            <li key={idx} className="ml-6 list-disc text-muted-foreground pl-1">
              {trimmed.substring(2)}
            </li>
          );
        }

        if (trimmed.startsWith("> ")) {
          return (
            <blockquote key={idx} className="border-l-4 border-primary/50 bg-accent/40 pl-4 py-2 my-2 rounded-r-md italic text-muted-foreground">
              {trimmed.substring(2)}
            </blockquote>
          );
        }

        if (trimmed === "---") {
          return <hr key={idx} className="my-6 border-border" />;
        }

        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        let htmlContent = line;
        const boldRegex = /\*\*(.*?)\*\*/g;
        htmlContent = htmlContent.replace(boldRegex, "<strong>$1</strong>");

        return (
          <p
            key={idx}
            className="text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        );
      })}
    </div>
  );
}

function ChatMessageRenderer({ content, isUser }: { content: string; isUser: boolean }) {
  if (!content) return null;
  const lines = content.split("\n");
  return (
    <div className={`space-y-1.5 ${isUser ? "text-primary-foreground" : "text-foreground"}`}>
      {lines.map((line, idx) => {
        let htmlContent = line;
        const boldRegex = /\*\*(.*?)\*\*/g;
        htmlContent = htmlContent.replace(boldRegex, "<strong>$1</strong>");
        return (
          <p
            key={idx}
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        );
      })}
    </div>
  );
}

export default function FeatureDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; featureId: string }>;
}) {
  const { projectId, featureId } = use(params);
  const [activeTab, setActiveTab] = useState("chat");
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [message]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!message.trim() || sendMessageMutation.isPending) {
        return;
      }
      sendMessageMutation.mutate({
        featureId,
        message,
      });
    }
  };

  const {
    data: feature,
    isLoading: isLoadingFeature,
    refetch: refetchFeature,
  } = trpc.features.get.useQuery(
    { featureId },
    {
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "discovery" || status === "prd_generation" ? 3500 : false;
      },
    }
  );

  const { data: chats = [], refetch: refetchChats } = trpc.features.getChat.useQuery(
    { featureId },
    {
      refetchInterval: (query) => {
        return feature?.status === "discovery" ? 3500 : false;
      },
    }
  );

  const sendMessageMutation = trpc.features.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      refetchChats();
      refetchFeature();
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) {
      return;
    }
    sendMessageMutation.mutate({
      featureId,
      message,
    });
  };

  const [rejectReason, setRejectReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

  const approveReleaseMutation = trpc.features.approveRelease.useMutation({
    onSuccess: () => {
      refetchFeature();
      refetchChats();
      setIsApproveDialogOpen(false);
    },
  });

  const rejectReleaseMutation = trpc.features.rejectRelease.useMutation({
    onSuccess: () => {
      refetchFeature();
      refetchChats();
      setRejectReason("");
      setIsRejectDialogOpen(false);
    },
  });

  const handleApproveRelease = () => {
    approveReleaseMutation.mutate({ featureId });
  };

  const handleRejectRelease = (e: React.FormEvent) => {
    e.preventDefault();
    rejectReleaseMutation.mutate({
      featureId,
      reason: rejectReason.trim() || undefined,
    });
  };

  const handleSkipQuestion = () => {
    if (sendMessageMutation.isPending) return;
    sendMessageMutation.mutate({
      featureId,
      message: "[Skip Question] Please bypass this question and compile the PRD now.",
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  useEffect(() => {
    if (feature && feature.status !== "discovery" && feature.status !== "prd_generation") {
      setActiveTab("prd");
    }
  }, [feature]);

  if (isLoadingFeature) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-destructive font-medium">
        Feature request not found.
      </div>
    );
  }

  const isDiscovery = feature.status === "discovery";
  const isPrdGenerating = feature.status === "prd_generation";
  const prdGenerated = feature.status !== "discovery" && feature.status !== "prd_generation";
  const isAiTyping = chats.length > 0 && chats[chats.length - 1].sender === "user" && isDiscovery;

  const isFirstQuestionLoading = isDiscovery && chats.length === 0;
  const showTypingIndicator = isAiTyping || sendMessageMutation.isPending || isFirstQuestionLoading;

  const featureTasks = (feature as any).project?.tasks?.filter((t: any) => t.prdId === feature.prd?.id) || [];
  const completedTasksCount = featureTasks.filter((t: any) => t.status === "done" || t.status === "review").length;
  const totalTasksCount = featureTasks.length;
  const isTasksComplete = totalTasksCount > 0 && completedTasksCount === totalTasksCount;

  const linkedPrs = (feature as any).pullRequests || [];
  const latestPr = linkedPrs.length > 0 ? linkedPrs[linkedPrs.length - 1] : null;
  const isPrClean = latestPr ? latestPr.status === "reviewed" : false;
  const isPrBlocked = latestPr ? latestPr.status === "fix_needed" : false;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/dashboard/projects/${projectId}/features`}
          className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="size-3" />
          Back to Feature Requests
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{feature.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Source: <span className="capitalize">{feature.source.replace("_", " ")}</span> • Submitted{" "}
              {formatDistanceToNow(new Date(feature.createdAt), { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              Status:
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                feature.status === "shipped"
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  : feature.status === "discovery"
                  ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                  : "bg-purple-500/10 text-purple-500 border border-purple-500/20"
              }`}
            >
              {feature.status.replace("_", " ")}
            </span>
          </div>
        </div>
      </div>

      {isPrdGenerating ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center border-border bg-card">
          <CardContent className="space-y-6 max-w-md">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Spinner className="size-8" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl font-bold text-foreground">AI PM is Compiling your PRD</CardTitle>
              <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                Analyzing clarification chat transcript, querying Pinecone codebase context vectors, and generating structured acceptance criteria. This usually takes around 10–15 seconds.
              </CardDescription>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3 flex-1 min-h-[500px]">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
              <TabsList className="border-b border-border bg-transparent w-full justify-start rounded-none h-9 p-0 gap-4">
                {prdGenerated && (
                  <TabsTrigger
                    value="prd"
                    className="cursor-pointer border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 h-9 font-semibold text-muted-foreground data-[state=active]:text-foreground"
                  >
                    <FileText className="size-4 mr-1.5" />
                    PRD Specifications
                  </TabsTrigger>
                )}
                {prdGenerated && (
                  <TabsTrigger
                    value="release"
                    className="cursor-pointer border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 h-9 font-semibold text-muted-foreground data-[state=active]:text-foreground"
                  >
                    <GitCommit className="size-4 mr-1.5" />
                    Release Center
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="chat"
                  className="cursor-pointer border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 h-9 font-semibold text-muted-foreground data-[state=active]:text-foreground"
                >
                  <ChatText className="size-4 mr-1.5" />
                  AI Discovery Chat
                </TabsTrigger>
              </TabsList>

              {prdGenerated && (
                <TabsContent value="prd" className="flex-1 mt-6">
                  <Card className="border-border bg-card shadow-sm h-full">
                    <CardHeader className="border-b border-border/50 py-4 bg-muted/20">
                      <CardTitle className="text-base font-bold text-foreground">Product Requirements Document</CardTitle>
                      <CardDescription>Generated automatically by ShipFlow AI Product Agent</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 overflow-y-auto max-h-[600px]">
                      {feature.prd?.rawContent ? (
                        <MarkdownRenderer content={feature.prd.rawContent} />
                      ) : (
                        <div className="space-y-4">
                          <h3 className="font-bold text-lg text-foreground">Problem Statement</h3>
                          <p className="text-muted-foreground text-sm leading-relaxed">{feature.prd?.problemStatement}</p>
                          <hr className="border-border" />
                          <h3 className="font-bold text-base text-foreground">Acceptance Criteria</h3>
                          <ul className="list-disc pl-5 space-y-1">
                            {feature.prd?.acceptanceCriteria.map((item, idx) => (
                              <li key={idx} className="text-muted-foreground text-sm">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {prdGenerated && (
                <TabsContent value="release" className="flex-1 mt-6">
                  <Card className="border-border bg-card shadow-sm h-full">
                    <CardHeader className="border-b border-border/50 py-4 bg-muted/20">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <CardTitle className="text-base font-bold text-foreground">Release Center</CardTitle>
                          <CardDescription>Verify all project requirements and authorize the final production release.</CardDescription>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                            feature.status === "shipped"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : feature.status === "ready_for_review"
                              ? "bg-pink-500/10 text-pink-500 border border-pink-500/20"
                              : "bg-muted text-muted-foreground border border-muted/20"
                          }`}
                        >
                          {feature.status.replace("_", " ")}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6 overflow-y-auto max-h-[600px]">
                      <div className="space-y-4">
                        <h3 className="font-bold text-sm text-foreground uppercase tracking-wider text-muted-foreground/80">
                          Release Checklist
                        </h3>

                        <div className="grid gap-3">
                          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-muted/10">
                            <CheckCircle className="size-5 text-emerald-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="font-semibold text-sm text-foreground">Product Requirements Document (PRD)</p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                AI has successfully compiled specifications based on the user's initial description and follow-up clarifications.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-muted/10">
                            {isTasksComplete ? (
                              <CheckCircle className="size-5 text-emerald-500 mt-0.5 shrink-0" />
                            ) : (
                              <Warning className="size-5 text-amber-500 mt-0.5 shrink-0" />
                            )}
                            <div>
                              <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                                Engineering Tasks
                                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-normal">
                                  {completedTasksCount} / {totalTasksCount} Complete
                                </span>
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                {isTasksComplete
                                  ? "All technical tasks generated from the PRD are in Done or In Review state."
                                  : "Some technical tasks generated from the PRD are still pending implementation."}
                              </p>
                              
                              {featureTasks.length > 0 && (
                                <div className="mt-3 grid gap-1.5 pl-2 border-l border-border">
                                  {featureTasks.map((task: any) => (
                                    <div key={task.id} className="flex items-center gap-2 text-xs">
                                      {task.status === "done" || task.status === "review" ? (
                                        <Check className="size-3 text-emerald-500 shrink-0" />
                                      ) : (
                                        <Clock className="size-3 text-muted-foreground shrink-0" />
                                      )}
                                      <span className={task.status === "done" ? "line-through text-muted-foreground/70" : "text-foreground font-medium"}>
                                        {task.title}
                                      </span>
                                      <span className={`text-[10px] uppercase font-semibold px-1 rounded ml-auto ${
                                        task.status === "done" ? "bg-emerald-500/10 text-emerald-500" :
                                        task.status === "review" ? "bg-pink-500/10 text-pink-500" :
                                        task.status === "in_progress" ? "bg-blue-500/10 text-blue-500" :
                                        "bg-muted text-muted-foreground"
                                      }`}>
                                        {task.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-muted/10">
                            {latestPr ? (
                              <CheckCircle className="size-5 text-emerald-500 mt-0.5 shrink-0" />
                            ) : (
                              <Warning className="size-5 text-amber-500 mt-0.5 shrink-0" />
                            )}
                            <div>
                              <p className="font-semibold text-sm text-foreground">Linked Pull Request</p>
                              <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                {latestPr ? (
                                  <div className="flex flex-col gap-1">
                                    <span>
                                      Linked Pull Request <span className="font-semibold text-foreground">#{latestPr.prNumber}</span>: {latestPr.title}
                                    </span>
                                    <span className="font-mono text-[10px] bg-accent px-1.5 py-0.5 rounded w-fit text-muted-foreground">
                                      {latestPr.baseBranch} ⬅️ {latestPr.headSha.substring(0, 7)}
                                    </span>
                                  </div>
                                ) : (
                                  "No Pull Request has been linked to this feature request yet. Push code changes to your repository to trigger review."
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-muted/10">
                            {isPrClean ? (
                              <CheckCircle className="size-5 text-emerald-500 mt-0.5 shrink-0" />
                            ) : isPrBlocked ? (
                              <X className="size-5 text-destructive mt-0.5 shrink-0" />
                            ) : (
                              <Warning className="size-5 text-muted-foreground mt-0.5 shrink-0" />
                            )}
                            <div>
                              <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                                AI QA Code Review
                                {latestPr && (
                                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                    isPrClean ? "bg-emerald-500/10 text-emerald-500" :
                                    isPrBlocked ? "bg-destructive/10 text-destructive border border-destructive/20" :
                                    "bg-muted text-muted-foreground"
                                  }`}>
                                    {isPrClean ? "Passed" : isPrBlocked ? "Changes Requested" : latestPr.status}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                {latestPr
                                  ? `AI QA evaluated your changes. Latest Verdict: ${isPrClean ? "APPROVE" : isPrBlocked ? "REQUEST CHANGES" : "PENDING"}`
                                  : "AI QA review will automatically trigger when developers push a pull request."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {latestPr?.reviewComment && (
                        <div className="space-y-3">
                          <h3 className="font-bold text-sm text-foreground uppercase tracking-wider text-muted-foreground/80">
                            Latest AI QA Review Log
                          </h3>
                          <div className="rounded-xl border border-border bg-card/60 p-5 overflow-y-auto max-h-[400px]">
                            <MarkdownRenderer content={latestPr.reviewComment} />
                          </div>
                        </div>
                      )}

                      <hr className="border-border" />

                      {feature.status === "ready_for_review" && (
                        <div className="flex flex-col gap-4 p-4 rounded-xl border border-pink-500/20 bg-pink-500/5">
                          <div className="flex items-center gap-2">
                            <Sparkle className="size-5 text-pink-500 animate-pulse" />
                            <h4 className="font-bold text-sm text-pink-500 uppercase tracking-wider">
                              Human Authorization Required
                            </h4>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            AI review has completed successfully with no blocking issues. Verify the logs above and complete the release approval.
                          </p>
                          <div className="flex flex-wrap gap-3 mt-1">
                            <Button
                              onClick={() => setIsApproveDialogOpen(true)}
                              className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow"
                            >
                              Approve & Ship Release
                            </Button>
                            <Button
                              onClick={() => setIsRejectDialogOpen(true)}
                              variant="outline"
                              className="cursor-pointer border-destructive/30 hover:bg-destructive/5 hover:text-destructive text-destructive font-semibold"
                            >
                              Reject Release
                            </Button>
                          </div>
                        </div>
                      )}

                      {feature.status === "shipped" && (
                        <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                          <CheckCircle className="size-6 text-emerald-500 shrink-0" />
                          <div>
                            <p className="font-bold text-sm text-emerald-500">Feature Successfully Shipped</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              This feature release has been authorized by a human reviewer and is deployed in production.
                            </p>
                          </div>
                        </div>
                      )}

                      {feature.status !== "ready_for_review" && feature.status !== "shipped" && (
                        <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/20">
                          <Warning className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-sm text-foreground">Awaiting Implementation</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                              This feature request is currently in the **{feature.status}** phase. Human release approval will become available once a pull request is linked and AI QA review checks pass cleanly.
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              <TabsContent value="chat" className="flex-1 mt-6 flex flex-col min-h-[400px] max-h-[600px]">
                <Card className="border-border bg-card flex flex-col flex-1 shadow-sm overflow-hidden h-full">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[450px]">
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="flex size-7 shrink-0 select-none items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-xs">
                        U
                      </div>
                      <div className="rounded-lg bg-accent/40 px-3 py-2 border border-border/50 text-sm">
                        <p className="font-semibold text-foreground">Feature Request Submitted</p>
                        <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>

                    {chats.map((chat) => (
                      <div
                        key={chat.id}
                        className={`flex gap-3 max-w-[85%] ${
                          chat.sender === "user" ? "ml-auto flex-row-reverse" : ""
                        }`}
                      >
                        <div
                          className={`flex size-7 shrink-0 select-none items-center justify-center rounded-full font-bold text-xs ${
                            chat.sender === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-accent text-accent-foreground"
                          }`}
                        >
                          {chat.sender === "user" ? "U" : "AI"}
                        </div>
                        <div
                          className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                            chat.sender === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-accent/40 border border-border/50 text-foreground"
                          }`}
                        >
                          <ChatMessageRenderer content={chat.message} isUser={chat.sender === "user"} />
                        </div>
                      </div>
                    ))}
                    {showTypingIndicator && (
                      <div className="flex gap-3 max-w-[85%]">
                        <div className="flex size-7 shrink-0 select-none items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-xs">
                          AI
                        </div>
                        <div className="rounded-lg px-3.5 py-2.5 text-sm leading-relaxed bg-accent/40 border border-border/50 text-foreground flex items-center gap-1.5 shadow-sm">
                          <span className="text-muted-foreground italic text-xs">
                            {isFirstQuestionLoading
                              ? "AI PM is generating the first clarification question…"
                              : "AI PM is thinking…"}
                          </span>
                          <span className="flex gap-1 items-center h-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" />
                          </span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {isDiscovery && (
                    <div className="border-t border-border p-4 bg-muted/10 flex flex-col gap-3">
                      <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                        <Textarea
                          ref={textareaRef}
                          placeholder="Type your response to clarify details…"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyDown={handleKeyDown}
                          disabled={sendMessageMutation.isPending}
                          required
                          rows={1}
                          className="border-border bg-background focus-visible:ring-primary flex-1 min-h-[40px] max-h-[160px] py-2 px-3 resize-none rounded-xl align-bottom"
                        />
                        <Button
                          type="submit"
                          size="icon"
                          disabled={!message.trim() || sendMessageMutation.isPending}
                          className="cursor-pointer bg-primary text-primary-foreground"
                        >
                          {sendMessageMutation.isPending ? (
                            <Spinner className="size-4" />
                          ) : (
                            <PaperPlaneRight className="size-4" />
                          )}
                        </Button>
                      </form>
                      <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
                        <span>AI PM is waiting for details.</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleSkipQuestion}
                          disabled={sendMessageMutation.isPending}
                          className="cursor-pointer text-xs text-primary hover:text-primary/80 hover:bg-transparent h-fit p-0 font-semibold flex items-center gap-1"
                        >
                          Skip Question & Compile PRD ➡️
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="py-4 border-b border-border/50">
                <CardTitle className="text-sm font-bold text-foreground">Project Context</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground font-semibold">Project</div>
                  <div className="text-sm font-medium text-foreground">{feature.project.repoFullName}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                    <GitBranch className="size-3" />
                    Target Branch
                  </div>
                  <div className="text-sm font-mono text-foreground bg-accent px-1.5 py-0.5 rounded w-fit">
                    {feature.project.branch}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="py-4 border-b border-border/50">
                <CardTitle className="text-sm font-bold text-foreground">Discovery Lifecycle</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs leading-relaxed text-muted-foreground">
                {isDiscovery && (
                  <div className="flex gap-2.5 items-start">
                    <Warning className="size-4 shrink-0 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground text-sm">Under Discovery</p>
                      <p className="mt-1">
                        Answer the questions asked by the AI Agent PM. Once the requirements are complete, the PRD will compile automatically.
                      </p>
                    </div>
                  </div>
                )}
                {prdGenerated && (
                  <div className="flex gap-2.5 items-start">
                    <CheckCircle className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground text-sm">Discovery Completed</p>
                      <p className="mt-1">
                        The PRD document has been compiled and is ready. The feature request has progressed to the **planning** and task-board phase.
                      </p>
                      {feature.status === "planning" && (
                        <Button
                          render={
                            <Link href={`/dashboard/projects/${projectId}/tasks`}>
                              <Kanban className="size-3.5" />
                              Go to Kanban Tasks
                            </Link>
                          }
                          size="sm"
                          className="mt-3 cursor-pointer bg-primary text-primary-foreground font-semibold gap-1.5"
                        />
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Dialog for Releasing Approval confirmation */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="border-border bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Approve & Ship Release?</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Confirming this release will update the feature request status to **Shipped** and log the approval milestone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setIsApproveDialogOpen(false)}
              disabled={approveReleaseMutation.isPending}
              className="border-border cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApproveRelease}
              disabled={approveReleaseMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer font-semibold"
            >
              {approveReleaseMutation.isPending ? "Shipping..." : "Approve & Ship"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Releasing Rejection confirmation */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="border-border bg-card max-w-md">
          <form onSubmit={handleRejectRelease}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">Reject & Send Back?</DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Describe the reason for rejection so the development team or AI coding agents can implement changes.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <label htmlFor="reject-reason" className="text-sm font-medium text-foreground block mb-2">
                Rejection Reason (Optional)
              </label>
              <Textarea
                id="reject-reason"
                placeholder="e.g. Broken styling on landing page, missing validations..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={rejectReleaseMutation.isPending}
                className="border-border bg-background min-h-[100px]"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRejectDialogOpen(false)}
                disabled={rejectReleaseMutation.isPending}
                className="border-border cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={rejectReleaseMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer font-semibold"
              >
                {rejectReleaseMutation.isPending ? "Processing..." : "Reject & Send Back"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
