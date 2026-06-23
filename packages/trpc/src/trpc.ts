import { initTRPC, TRPCError } from "@trpc/server";
import { prisma } from "@ai-code-reviewer-trpc/database";
import * as trpcExpress from "@trpc/server/adapters/express";

export interface Context {
  user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  session: {
    id: string;
    expiresAt: Date;
    token: string;
    createdAt: Date;
    updatedAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
    userId: string;
  } | null;
}

function getCookieValue(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp('(^|;\\s*)' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[2] || "") : null;
}

export const createContext = async (
  opts: trpcExpress.CreateExpressContextOptions
): Promise<Context> => {
  const cookieHeader = opts.req.headers.cookie || "";
  const token = getCookieValue(cookieHeader, "better-auth.session_token") || 
                getCookieValue(cookieHeader, "__Secure-better-auth.session_token") ||
                (opts.req.headers.authorization?.startsWith("Bearer ") 
                  ? opts.req.headers.authorization.substring(7) 
                  : null);

  if (!token) {
    return { user: null, session: null };
  }

  try {
    const dbToken = token.split(".")[0] as string;
    const dbSession = await prisma.session.findUnique({
      where: { token: dbToken },
      include: { user: true },
    });

    if (!dbSession || new Date() > new Date(dbSession.expiresAt)) {
      return { user: null, session: null };
    }

    const { user, ...session } = dbSession;
    return { user, session };
  } catch (error) {
    console.error("Error fetching session:", error);
    return { user: null, session: null };
  }
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session,
    },
  });
});