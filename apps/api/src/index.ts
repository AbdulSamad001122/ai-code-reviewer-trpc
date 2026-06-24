import express from "express";
import cors from "cors";
import "dotenv/config";

import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter, createContext } from "@ai-code-reviewer-trpc/trpc";

const app = express();

const allowedOrigins = [
  process.env.BETTER_AUTH_URL,
  "http://localhost:3000",
  "http://localhost:3001"
].filter(Boolean).map(url => url!.replace(/\/$/, ""));

const allowedSet = new Set(allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      // Allow only configured BETTER_AUTH_URL and localhost ports strictly
      const isAllowed = allowedSet.has(origin);
      
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
