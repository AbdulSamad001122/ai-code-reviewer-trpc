import { inngest } from "@/features/inngest/client";
import { savePullRequest } from "@/features/reviews/server/save-pull-request";
import { getGithubApp } from "../utils/github-app";


const REVIEWABLE_ACTIONS = ["opened", "synchronize", "reopened"];

export type PullRequestWebhookPayload = {
    action: string;
    installation: { id: number };
    repository: { full_name: string };
    pull_request: {
      number: number;
      title: string;
      user: { login: string } | null;
      head: { sha: string; ref: string };
      base: { ref: string };
      body: string | null;
    };
  };

async function isSignatureValid(payload: string, signature: string | null) {
    if (!signature) {
      return false;
    }
  
    const app = getGithubApp();
    return app.webhooks.verify(payload, signature);
  }
  


export async function handleGithubWebhook(request:Request) {
    const payload = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const eventName = request.headers.get("x-github-event");

  const isValid = await isSignatureValid(payload , signature);

  if (!isValid) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (eventName !== "pull_request" && eventName !== "push") {
    return Response.json({ received: true });
  }

  if (eventName === "push") {
    const event = JSON.parse(payload);
    
    // Filter out commits made by the GitHub app itself to prevent feedback loops
    const pusherName = event.pusher?.name || "";
    if (
      pusherName.includes("shipflow") || 
      pusherName.includes("theship") || 
      pusherName.includes("parrot-code-reviewer") || 
      event.sender?.login?.includes("shipflow") || 
      event.sender?.login?.includes("theship")
    ) {
      return Response.json({ received: true, ignored: true, reason: "Self commit" });
    }

    const branch = event.ref.replace("refs/heads/", "");

    await inngest.send({
      name: "github/push.received",
      data: {
        installationId: event.installation.id,
        repoFullName: event.repository.full_name,
        branch,
      },
    });

    return Response.json({ received: true });
  }

  const event = JSON.parse(payload) as PullRequestWebhookPayload;

  console.log("event", event);

  if(!REVIEWABLE_ACTIONS.includes(event.action)){
    return Response.json({ received: true });
  }

  const pullRequest = await savePullRequest(event);

  await inngest.send({
    name: "github/pr.received",
    data: { pullRequestId: pullRequest.id },
  });

  return Response.json({ received: true });
}