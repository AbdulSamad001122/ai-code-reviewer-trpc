import { getGithubApp } from "@/features/github/utils/github-app";

export async function postPrComment(
    installationId: number,
    repoFullName: string,
    prNumber: number,
    body: string
) {
    const trimmed = body.trim();
    if (!trimmed) {
        console.warn("[postPrComment] Skipping comment creation because the body is empty.");
        return;
    }

    const app = getGithubApp();
    const octokit = await app.getInstallationOctokit(installationId);
    const [owner, repo] = repoFullName.split("/");

    await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
        owner,
        repo,
        issue_number: prNumber,
        body: trimmed,
    });
}