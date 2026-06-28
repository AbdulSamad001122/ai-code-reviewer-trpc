import { getServerSession } from "@/features/auth/actions";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  return NextResponse.json({
    email: session.user.email,
    name: session.user.name,
    id: session.user.id,
    ADMIN_EMAIL_env: process.env.ADMIN_EMAIL ?? "(not set, using default)",
  });
}
