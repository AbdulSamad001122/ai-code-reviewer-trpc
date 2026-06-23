import { createTRPCReact } from "@trpc/react-query"
import type { AppRouter } from "@ai-code-reviewer-trpc/trpc"

export const trpc = createTRPCReact<AppRouter>()