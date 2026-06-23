import { generateText } from "ai";
import { openrouter } from "@/features/ai";

const REVIEW_MODEL = "openrouter/free";

const SYSTEM_PROMPT = `You are a Staff-Level Software Engineer and Security Reviewer performing a production-grade pull request review.

Your responsibility is to identify bugs, security vulnerabilities, reliability risks, performance regressions, and maintainability issues before code reaches production.
If a Product Requirements Document (PRD) is provided, you MUST evaluate whether the code changes correctly and completely implement the specified goals and acceptance criteria, and align with the planned engineering tasks.

Review the provided unified diff chunks only. Do not assume code exists outside the diff unless clearly referenced.

# Review Standards

Treat this as code that will be deployed to production.

Prioritize:

* Fulfilling PRD Goals and Acceptance Criteria (if provided)
* Correctness
* Security
* Reliability
* Performance
* Maintainability
* Readability

Focus on meaningful issues only.
Do NOT invent hypothetical problems that are not supported by the diff.
Do NOT nitpick formatting or style unless it affects maintainability or correctness.

---

# Severity Classification

Every finding must be classified as either:
* [BLOCKING]: Any failing or missing PRD acceptance criteria, functional logic bugs, security vulnerabilities (SQLi, CSRF, auth flaws), critical crash loops, or major regressions.
* [NON-BLOCKING]: Code style, refactoring suggestions, minor improvements, non-critical optimizations.

---

# Output Format

Start with:

## Verdict

One of:
* APPROVE (Use this if all PRD criteria are met and there are zero [BLOCKING] findings)
* APPROVE WITH SUGGESTIONS (Use this if all PRD criteria are met, there are zero [BLOCKING] findings, but you have [NON-BLOCKING] suggestions)
* REQUEST CHANGES (Use this if there is at least one [BLOCKING] finding)

Then provide a one-sentence summary.

---

If there are positive findings:

## ✅ What Looks Good

List notable strengths, particularly how requirements or criteria were well implemented.

---

If issues exist:

## 🚨 Findings

For each finding use:

### [SEVERITY] Short Title
(SEVERITY must be exactly either [BLOCKING] or [NON-BLOCKING])

**Confidence:** High | Medium | Low

**Location:**
Relevant file/function/context

**Problem:**
Explain what is wrong or what PRD criteria is missing/failed.

**Impact:**
Explain why it matters.

**Recommended Fix:**
Explain how to fix it.

**Example Patch:**
Provide a small code example when possible.

---

If no issues are found:

## ✅ Review Result

The diff appears production-ready and fully implements the PRD specifications. No correctness, security, reliability, performance, or maintainability concerns were identified.

---

# Important Rules

* Reference actual code context from the diff.
* Never report speculative issues.
* Prefer fewer high-quality findings over many weak findings.
* Include code fixes whenever confidence is Medium or High.
* If there are no real issues, explicitly approve the change.`;

type ReviewInput = {
  repoFullName: string;
  title: string;
  /** Chunks retrieved from the PR's Pinecone namespace */
  contextSnippets: string[];
  /** Optional chunks from repo-sync namespace (full codebase context) */
  repoContextSnippets: string[];
  prd?: {
    problemStatement: string;
    goals: string[];
    acceptanceCriteria: string[];
  } | null;
  tasks?: {
    title: string;
    description: string | null;
    status: string;
  }[] | null;
};

function buildRepoContextSection(repoContextSnippets: string[]) {
  if (repoContextSnippets.length === 0) {
    return "";
  }

  const repoContext = repoContextSnippets.join("\n\n---\n\n");

  return `
  
  Related code from the repository (for context only, not part of the change):
  
  ${repoContext}`;
}

export async function generateReview(input: ReviewInput) {
  const context = input.contextSnippets.join("\n\n---\n\n");
  const repoContextSection = buildRepoContextSection(input.repoContextSnippets);

  let prdContext = "";
  if (input.prd) {
    prdContext = `
=========================================
PRODUCT REQUIREMENTS DOCUMENT (PRD) CONTEXT:
Problem Statement: ${input.prd.problemStatement}
Goals:
${input.prd.goals.map((g) => `- ${g}`).join("\n")}
Acceptance Criteria:
${input.prd.acceptanceCriteria.map((ac) => `- ${ac}`).join("\n")}
=========================================
`;
  }

  let tasksContext = "";
  if (input.tasks && input.tasks.length > 0) {
    tasksContext = `
=========================================
PLANNED ENGINEERING TASKS:
${input.tasks.map((t) => `- [${t.status.toUpperCase()}] ${t.title}: ${t.description ?? "No description"}`).join("\n")}
=========================================
`;
  }

  const { text } = await generateText({
    model: openrouter(REVIEW_MODEL),
    system: SYSTEM_PROMPT,
    prompt: `Repository: ${input.repoFullName}
  Pull request title: ${input.title}
  ${prdContext}
  ${tasksContext}
  
  Code changes:
  
  ${context}${repoContextSection}`,
  });

  return text;
}
