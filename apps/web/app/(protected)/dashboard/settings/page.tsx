"use client";

import React, { useState } from "react";
import { trpc } from "@/trpc/trpc";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import {
  Check,
  Crown,
  Gear,
  Sparkle,
  Terminal,
  ArrowUpRight,
} from "@phosphor-icons/react";

export default function SettingsPage() {
  const { data: billing, isLoading, refetch } = trpc.billing.getBillingState.useQuery();
  const checkoutMutation = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to generate checkout link.");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to initiate checkout.");
    },
  });

  const [simulating, setSimulating] = useState(false);

  const handleUpgrade = (variant: "starter" | "unlimited") => {
    toast.loading(`Redirecting to Lemon Squeezy checkout...`);
    checkoutMutation.mutate({ variant });
  };

  const handleMockWebhook = async (plan: "free" | "starter" | "unlimited", status: string) => {
    setSimulating(true);
    try {
      // Find user id from somewhere. We can query getBillingState to return userId or check if we can get it.
      // Wait, we can fetch userId in getBillingState, let's check!
      // In getBillingState, we didn't return userId. Let's make the mock endpoint handle active session user if userId isn't provided,
      // or we can pass a dummy userId or call it directly.
      // Wait! Let's verify how the mock webhook can identify the user.
      // Since it's a POST request from the client in development mode, we can read the session cookie in the mock webhook and find the logged-in user!
      // Yes! That's incredibly elegant. Let's pass the active session user's id. Let's make the mock webhook query the session, or the client can pass userId if we return it in getBillingState.
      // Let's modify billingRouter.getBillingState to also return the userId!
      // Wait, let's look at getBillingState in packages/trpc/src/routers/billing.ts. It fetches user by ctx.user.id. So we can just return userId: ctx.user.id in the billing state!
      // Let's check: yes, we can return userId: ctx.user.id in getBillingState! Let's update billing.ts or make the mock webhook read the user session.
      // Actually, passing the userId from the client is super simple if getBillingState returns it. Let's make sure the client gets the userId.
      const userId = (billing as any)?.userId;
      
      const response = await fetch("/api/billing/mock-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan, status }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast.success(`Successfully simulated ${plan} upgrade!`);
      refetch();
    } catch (e: any) {
      toast.error(`Simulation failed: ${e.message}`);
    } finally {
      setSimulating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Spinner className="size-8" />
      </div>
    );
  }

  const { plan = "free", status = "inactive", usage, limits } = billing || {};

  const renderLimit = (val: number | undefined) => {
    if (val === undefined || val === null) return "0";
    return val === Infinity ? "∞" : val.toString();
  };

  const getPercentage = (used: number, max: number) => {
    if (max === Infinity) return 0;
    if (max === 0) return 100;
    return Math.min(Math.round((used / max) * 100), 100);
  };

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <Gear className="size-8 text-primary animate-spin-slow" /> Settings & Billing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription tier, track feature usage, and view active limits.
        </p>
      </div>

      {/* Subscription Plans */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Free Plan Card */}
        <Card className={`border-border ${plan === "free" ? "ring-2 ring-primary bg-card/60" : "bg-card"}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant={plan === "free" ? "default" : "outline"}>Free</Badge>
              {plan === "free" && <span className="text-xs font-semibold text-primary">Current Plan</span>}
            </div>
            <CardTitle className="text-2xl font-bold mt-2">$0</CardTitle>
            <CardDescription>Get started with basic code reviews.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-xs space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="size-4 text-emerald-500 font-bold" /> 1 Workspace limit
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-emerald-500 font-bold" /> 1 Project limit
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-emerald-500 font-bold" /> 1 Feature per project
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-emerald-500 font-bold" /> 2 PR Reviews analyzed
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button disabled variant="outline" className="w-full">
              {plan === "free" ? "Active" : "Downgrade"}
            </Button>
          </CardFooter>
        </Card>

        {/* Starter Plan Card */}
        <Card className={`border-border relative overflow-hidden ${plan === "starter" ? "ring-2 ring-primary bg-card/60" : "bg-card"}`}>
          <div className="absolute top-0 right-0 h-16 w-16 translate-x-8 -translate-y-8 bg-primary/20 rotate-45 pointer-events-none" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant={plan === "starter" ? "default" : "secondary"}>Starter</Badge>
              {plan === "starter" && <span className="text-xs font-semibold text-primary">Current Plan</span>}
            </div>
            <CardTitle className="text-2xl font-bold mt-2">$3<span className="text-sm font-normal text-muted-foreground"> / month</span></CardTitle>
            <CardDescription>Great for small projects and teams.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-xs space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="size-4 text-emerald-500 font-bold" /> 1 Workspace limit
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-emerald-500 font-bold" /> 3 Projects limit
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-emerald-500 font-bold" /> 3 Features per project
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-emerald-500 font-bold" /> 12 PR Reviews analyzed
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            {plan === "starter" ? (
              <Button disabled variant="outline" className="w-full">Active</Button>
            ) : (
              <Button onClick={() => handleUpgrade("starter")} className="w-full group" disabled={checkoutMutation.isPending}>
                Upgrade to Starter <ArrowUpRight className="ml-1 size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Unlimited Plan Card */}
        <Card className={`border-border relative overflow-hidden bg-card/40 ${plan === "unlimited" ? "ring-2 ring-primary bg-card/60" : "bg-card"}`}>
          <div className="absolute top-0 right-0 h-20 w-20 translate-x-10 -translate-y-10 bg-amber-500/20 rotate-45 pointer-events-none" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                <Crown className="size-3.5 mr-1" /> Unlimited
              </Badge>
              {plan === "unlimited" && <span className="text-xs font-semibold text-amber-500">Current Plan</span>}
            </div>
            <CardTitle className="text-2xl font-bold mt-2">$9<span className="text-sm font-normal text-muted-foreground"> / month</span></CardTitle>
            <CardDescription>For serious developers and full workflows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-xs space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <Sparkle className="size-4 text-amber-500 font-bold" /> **Unlimited Workspaces**
              </li>
              <li className="flex items-center gap-2">
                <Sparkle className="size-4 text-amber-500 font-bold" /> **Unlimited Projects**
              </li>
              <li className="flex items-center gap-2">
                <Sparkle className="size-4 text-amber-500 font-bold" /> **Unlimited Features**
              </li>
              <li className="flex items-center gap-2">
                <Sparkle className="size-4 text-amber-500 font-bold" /> **Unlimited PR Reviews**
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            {plan === "unlimited" ? (
              <Button disabled variant="outline" className="w-full">Active</Button>
            ) : (
              <Button onClick={() => handleUpgrade("unlimited")} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold group" disabled={checkoutMutation.isPending}>
                Upgrade to Unlimited <ArrowUpRight className="ml-1 size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Usage Limits Section */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">Usage Tracker</CardTitle>
          <CardDescription>
            Overview of your current workspace configuration and limitations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Workspaces usage */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-foreground">Owned Workspaces</span>
              <span className="text-muted-foreground">
                {usage?.workspaces} / {renderLimit(limits?.workspaces)}
              </span>
            </div>
            {limits?.workspaces !== Infinity && (
              <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${getPercentage(usage?.workspaces || 0, limits?.workspaces || 1)}%` }}
                />
              </div>
            )}
          </div>

          {/* Projects usage */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-foreground">Created Projects</span>
              <span className="text-muted-foreground">
                {usage?.projects} / {renderLimit(limits?.projects)}
              </span>
            </div>
            {limits?.projects !== Infinity && (
              <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${getPercentage(usage?.projects || 0, limits?.projects || 1)}%` }}
                />
              </div>
            )}
          </div>

          {/* Features usage */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-foreground">Created Features (Across owned projects)</span>
              <span className="text-muted-foreground">
                {usage?.features} / {renderLimit(limits?.features)}
              </span>
            </div>
            {limits?.features !== Infinity && (
              <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${getPercentage(usage?.features || 0, limits?.features || 1)}%` }}
                />
              </div>
            )}
          </div>

          {/* PR Reviews usage */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-foreground">PR Reviews Analyzed (Usage counter)</span>
              <span className="text-muted-foreground">
                {usage?.prReviews} / {renderLimit(limits?.prReviews)}
              </span>
            </div>
            {limits?.prReviews !== Infinity && (
              <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${getPercentage(usage?.prReviews || 0, limits?.prReviews || 1)}%` }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Developer simulation panel */}
      {process.env.NODE_ENV === "development" && (
        <Card className="border-dashed border-primary/40 bg-accent/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-primary flex items-center gap-1.5">
              <Terminal className="size-4" /> Developer Simulation Toolbar
            </CardTitle>
            <CardDescription className="text-xs">
              Simulate subscription upgrades/downgrades instantly to verify limits enforcement logic locally.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMockWebhook("free", "inactive")}
              disabled={simulating}
            >
              Simulate Free Tier
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/5"
              onClick={() => handleMockWebhook("starter", "active")}
              disabled={simulating}
            >
              Simulate Starter Tier ($3)
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/40 text-amber-600 hover:bg-amber-500/5"
              onClick={() => handleMockWebhook("unlimited", "active")}
              disabled={simulating}
            >
              Simulate Unlimited Tier ($9)
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
