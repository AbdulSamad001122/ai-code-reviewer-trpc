import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") || "";
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("LEMON_SQUEEZY_WEBHOOK_SECRET is not set");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    // Verify signature
    const hmac = crypto.createHmac("sha256", secret);
    const digest = hmac.update(rawBody).digest("hex");
    
    let isSignatureValid = false;
    try {
      isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(digest, "utf-8"),
        Buffer.from(signature, "utf-8")
      );
    } catch (e) {
      isSignatureValid = false;
    }

    if (!isSignatureValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta?.event_name;
    const customData = payload.meta?.custom_data;
    const userId = customData?.userId;

    if (!userId) {
      console.warn("No userId found in custom_data");
      return NextResponse.json({ message: "No userId provided, ignoring" }, { status: 200 });
    }

    const attributes = payload.data?.attributes;
    const subscriptionId = payload.data?.id?.toString();

    // Map subscription status
    const status = attributes?.status || "inactive"; 
    const variantId = attributes?.variant_id?.toString();
    const renewsAtStr = attributes?.renews_at || attributes?.ends_at;
    const renewsAt = renewsAtStr ? new Date(renewsAtStr) : null;

    let plan = "free";
    if (status === "active" || status === "trialing") {
      if (variantId === process.env.LEMON_SQUEEZY_VARIANT_STARTER) {
        plan = "starter";
      } else if (variantId === process.env.LEMON_SQUEEZY_VARIANT_UNLIMITED) {
        plan = "unlimited";
      }
    }

    // Handle webhook events
    if (eventName === "subscription_created" || eventName === "subscription_updated" || eventName === "subscription_cancelled") {
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionPlan: plan,
          subscriptionStatus: status,
          lemonSqueezySubId: subscriptionId,
          renewsAt: renewsAt,
          prReviewCount: eventName === "subscription_created" ? 0 : undefined,
        },
      });

      console.log(`Updated user ${userId} to plan ${plan} (status: ${status})`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
