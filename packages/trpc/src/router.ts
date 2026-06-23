import { router, publicProcedure } from "./trpc.js";
import { githubRouter } from "./routers/github.js";
import { repoSyncRouter } from "./routers/repoSync.js";
import { workspaceRouter } from "./routers/workspace.js";
import { projectRouter } from "./routers/project.js";
import { featuresRouter } from "./routers/features.js";

export const appRouter = router({
    health: publicProcedure.query(() => {
        return {
            message: "Hello World",
        };
    }),
    github: githubRouter,
    repoSync: repoSyncRouter,
    workspace: workspaceRouter,
    project: projectRouter,
    features: featuresRouter,
});

export type AppRouter = typeof appRouter;