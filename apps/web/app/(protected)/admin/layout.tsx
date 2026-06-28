import { requireAuth } from "@/features/auth/actions";
import { redirect } from "next/navigation";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "abdulsamad.dev01@gmail.com";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  if (session.user.email !== ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
