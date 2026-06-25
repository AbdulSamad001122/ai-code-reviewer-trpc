import express from "express";
import cors from "cors";
import "dotenv/config";

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
