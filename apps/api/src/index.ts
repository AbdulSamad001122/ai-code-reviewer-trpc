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
      // Allow localhost, configured BETTER_AUTH_URL, Vercel previews, or dev ngrok tunnels
      const isAllowed = 
        allowedSet.has(origin) || 
        origin.endsWith(".vercel.app") || 
        origin.includes("ngrok-free.dev");
      
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
