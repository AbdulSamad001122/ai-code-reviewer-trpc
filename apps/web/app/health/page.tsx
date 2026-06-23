"use client"

import { trpc } from "@/trpc/trpc";


export default function Health() {

    const healthQuery = trpc.health.useQuery();

    return (
        <div>
            <h1>Health Data : {healthQuery.data?.message}</h1>
        </div>
    )
}