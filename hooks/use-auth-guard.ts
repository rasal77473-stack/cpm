import { useEffect } from "react"

/**
 * useAuthGuard - Call at the top of every protected page.
 *
 * Checks if the user has a valid localStorage token.
 * If NOT → immediately clears the stale auth_token cookie (so middleware
 * stops trusting it) and hard-redirects to /login.
 *
 * This closes the gap where an old cookie allows bypassing the login page.
 */
export function useAuthGuard(): { token: string | null; staffId: string | null; role: string | null; permissions: string[] } {
    const isBrowser = typeof window !== "undefined"

    const token = isBrowser ? localStorage.getItem("token") : null
    const staffId = isBrowser ? localStorage.getItem("staffId") : null
    const role = isBrowser ? localStorage.getItem("role") : null
    const permissions = isBrowser
        ? JSON.parse(localStorage.getItem("permissions") || "[]")
        : []

    useEffect(() => {
        const t = localStorage.getItem("token")
        if (!t) {
            // Kill stale cookie immediately so middleware redirects correctly next time
            document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax;"
            window.location.href = "/login"
        }
    }, [])

    return { token, staffId, role, permissions }
}
