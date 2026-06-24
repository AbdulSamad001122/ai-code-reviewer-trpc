import { router, protectedProcedure } from "../trpc.js";
import { z } from "zod";
import { prisma } from "@ai-code-reviewer-trpc/database";

export const billingRouter = router({
  getBillingState: protectedProcedure.query(async ({ ctx }) => {
    // Refresh user from DB to get the latest billing fields
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        prReviewCount: true,
        renewsAt: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Determine user's owned workspaces
    const ownedWorkspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId: ctx.user.id,
            role: "owner",
          },
        },
      },
      include: {
        projects: {
          include: {
            featureRequests: true,
          },
        },
      },
    });

    const workspaceCount = ownedWorkspaces.length;
    const projectCount = ownedWorkspaces.reduce((acc, w) => acc + w.projects.length, 0);
    const featureCount = ownedWorkspaces.reduce(
      (acc, w) => acc + w.projects.reduce((sum, p) => sum + p.featureRequests.length, 0),
      0
    );

    // Paid status check
    const isPaid = user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing";
    const effectivePlan = isPaid ? user.subscriptionPlan : "free";

    // Set usage counters and limits
    // Free: 1 workspace, 1 project, 1 feature per project, 2 PR reviews total
    // Starter: 1 workspace, 3 projects, 3 features per project, 12 PR reviews total
    // Unlimited: Unlimited
    const limits = {
      workspaces: effectivePlan === "unlimited" ? Infinity : 1,
      projects: effectivePlan === "unlimited" ? Infinity : (effectivePlan === "starter" ? 3 : 1),
      features: effectivePlan === "unlimited" ? Infinity : (effectivePlan === "starter" ? 3 : 1),
      prReviews: effectivePlan === "unlimited" ? Infinity : (effectivePlan === "starter" ? 12 : 2),
    };

    return {
      userId: ctx.user.id,
      plan: effectivePlan,
      status: user.subscriptionStatus || "inactive",
      renewsAt: user.renewsAt,
      usage: {
        workspaces: workspaceCount,
        projects: projectCount,
        features: featureCount,
        prReviews: user.prReviewCount,
      },
      limits,
    };
  }),

  createCheckout: protectedProcedure
    .input(z.object({ variant: z.enum(["starter", "unlimited"]) }))
    .mutation(async ({ ctx, input }) => {
      const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
      const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
      
      const variantId =
        input.variant === "starter"
          ? process.env.LEMON_SQUEEZY_VARIANT_STARTER
          : process.env.LEMON_SQUEEZY_VARIANT_UNLIMITED;

      if (!storeId || !variantId || !apiKey) {
        throw new Error("Lemon Squeezy is not fully configured (missing API Key, Store ID, or Variant ID)");
      }

      // Base URL from environment or request headers (default to better-auth url)
      const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
      const redirectUrl = `${baseUrl.replace(/\/$/, "")}/dashboard/settings`;

      try {
        const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
          method: "POST",
          headers: {
            "Accept": "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            data: {
              type: "checkouts",
              attributes: {
                checkout_data: {
                  email: ctx.user.email,
                  custom: {
                    userId: ctx.user.id,
                  },
                },
                product_options: {
                  redirect_url: redirectUrl,
                },
              },
              relationships: {
                store: {
                  data: {
                    type: "stores",
                    id: storeId,
                  },
                },
                variant: {
                  data: {
                    type: "variants",
                    id: variantId,
                  },
                },
              },
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Failed checkout creation: ${response.statusText} - ${errText}`);
        }

        const resBody = await response.json();
        const checkoutUrl = resBody.data.attributes.url;

        return { url: checkoutUrl };
      } catch (err: any) {
        console.error("Error creating Lemon Squeezy checkout:", err);
        throw new Error(err.message || "Failed to create checkout redirect link");
      }
    }),
});
