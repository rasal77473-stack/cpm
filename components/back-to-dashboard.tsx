"use client"

import Link from "next/link"
import { Home } from "lucide-react"

export function BackToDashboard() {
    return (
        <Link
            href="/dashboard"
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl hover:bg-white/60 bg-white/40 shadow-sm border border-gray-100 transition-all active:scale-95 shrink-0"
            title="Go to Dashboard"
        >
            <Home className="w-4 h-4 text-gray-700" />
        </Link>
    )
}
