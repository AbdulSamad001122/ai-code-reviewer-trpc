import { router, publicProcedure } from "./trpc.js";
import { githubRouter } from "./routers/github.js";
import { repoSyncRouter } from "./routers/repoSync.js";

export const appRouter = router({
    health: publicProcedure.query(() => {
        return {
            message: "Hello World",
        };
    }),
    github: githubRouter,
    repoSync: repoSyncRouter,
});

export type AppRouter = typeof appRouter;