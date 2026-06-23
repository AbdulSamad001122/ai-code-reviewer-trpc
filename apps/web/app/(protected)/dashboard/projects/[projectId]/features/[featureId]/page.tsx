"use client";

import { use, useState, useEffect, useRef } from "react";
import { trpc } from "@/trpc/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
                          <p>{chat.message}</p>
                        </div>
                      </div>
                    ))}
                    {(isAiTyping || sendMessageMutation.isPending) && (
                      <div className="flex gap-3 max-w-[85%]">
                        <div className="flex size-7 shrink-0 select-none items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-xs">
                          AI
                        </div>
                        <div className="rounded-lg px-3.5 py-2.5 text-sm leading-relaxed bg-accent/40 border border-border/50 text-foreground flex items-center gap-1.5 shadow-sm">
                          <span className="text-muted-foreground italic text-xs">AI PM is thinking</span>
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
                    <div className="border-t border-border p-4 bg-muted/10">
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
    </div>
  );
}
