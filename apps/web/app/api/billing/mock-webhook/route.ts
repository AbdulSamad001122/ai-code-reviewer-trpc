import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in development mode" }, { status: 403 });
  }

  try {
    const { userId, plan, status } = await req.json();

    if (!userId || !plan || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Update user properties in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: plan,
        subscriptionStatus: status,
        lemonSqueezySubId: status === "active" ? `mock_sub_${Date.now()}` : null,
        renewsAt: status === "active" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        prReviewCount: plan === "free" ? 0 : undefined, 
      },
    });

    return NextResponse.json({ success: true, message: `Mocked subscription updated to ${plan} (${status})` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
