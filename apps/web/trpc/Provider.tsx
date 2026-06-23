"use client"

import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/react-query"
import { trpc } from "./trpc"

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient())
    const [trpcClient] = useState(() => trpc.createClient({
        links: [
            httpBatchLink({
                url: typeof window !== "undefined" ? "/api/trpc" : "http://localhost:5000/trpc",
                fetch(url, options) {
                    return fetch(url, {
                        ...options,
                        credentials: "include",
                    });
                },
            })
        ]
    }))

    return (
        <QueryClientProvider client={queryClient}>
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
                {children}
            </trpc.Provider>
        </QueryClientProvider>
    )
}