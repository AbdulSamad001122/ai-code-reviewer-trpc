import express from "express";
import cors from "cors";
import "dotenv/config";
import { rateLimit } from "express-rate-limit";

import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter, createContext } from "@ai-code-reviewer-trpc/trpc";

const app = express();

const devOriginsStr = process.env.ALLOWED_DEV_ORIGINS || "";
const devOrigins = devOriginsStr.split(",").map(o => o.trim().replace(/\/$/, "")).filter(Boolean);

const allowedOrigins = [
  process.env.BETTER_AUTH_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  ...devOrigins
].filter(Boolean).map(url => url!.replace(/\/$/, ""));

const allowedSet = new Set(allowedOrigins);

const isTunnelDevOrigin = (origin: string): boolean => {
  try {
    const hostname = new URL(origin).hostname;
    return (
      hostname.endsWith(".loca.lt") ||
      hostname.endsWith(".ngrok-free.app") ||
      hostname.endsWith(".ngrok-free.dev") ||
      hostname.endsWith(".loophole.site") ||
      hostname.endsWith(".trycloudflare.com")
    );
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = allowedSet.has(origin) || isTunnelDevOrigin(origin);
      
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// Helper to parse cookies on incoming request
function getCookieValue(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp('(^|;\\s*)' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[2] || "") : null;
}

// Generate rate limiting key strictly by authenticated session token
function getRateLimitKey(req: express.Request): string {
  const cookieHeader = req.headers.cookie || "";
  const token = getCookieValue(cookieHeader, "better-auth.session_token") || 
                getCookieValue(cookieHeader, "__Secure-better-auth.session_token") ||
                (req.headers.authorization?.startsWith("Bearer ") 
                  ? req.headers.authorization.substring(7) 
                  : null);

  if (token) {
    return token.split(".")[0] || token;
  }

  // Strict: All unauthenticated requests share a single rate limit bucket
  return "anonymous";
}

// Set up rate limiting middleware to protect endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  limit: 100, 
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => getRateLimitKey(req),
  skip: (req) => req.path === "/health",
  message: {
    error: "Too many requests, please try again after 15 minutes."
  }
});
app.use(limiter);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

const PORT = process.env.PORT ;

app.listen(PORT, () => {
  console.log(`Server is running at this PORT : ${PORT}`);
});
