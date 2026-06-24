import express from "express";
import cors from "cors";
import "dotenv/config";

import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter, createContext } from "@ai-code-reviewer-trpc/trpc";

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true);
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

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server is running at this PORT : ${PORT}`);
});
