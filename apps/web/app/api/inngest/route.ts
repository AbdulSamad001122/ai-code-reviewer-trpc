import { serve } from "inngest/next";
import { inngest } from "@/features/inngest/client";
import { processTask } from "./function";
import { reviewPullRequest } from "@/features/reviews/server/review-pr-function";
import { syncRepoCodebaseFunction } from "@/features/repo-sync/server/sync-repo-function";
import {
  onFeatureCreatedFunction,
  onFeatureChatReceivedFunction,
  onFeatureReleaseRejectedFunction,
} from "@/features/features/server/discovery-workflow";
import { syncFeatureGitFunction, syncGithubPushToKanbanFunction, deleteFeatureGitFunction, deleteProjectGitFunction } from "@/features/git-sync/server/git-sync-function";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processTask,
    reviewPullRequest,
    syncRepoCodebaseFunction,
    onFeatureCreatedFunction,
    onFeatureChatReceivedFunction,
    onFeatureReleaseRejectedFunction,
    syncFeatureGitFunction,
    syncGithubPushToKanbanFunction,
    deleteFeatureGitFunction,
    deleteProjectGitFunction,
  ],
});
