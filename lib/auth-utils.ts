// Immediately clears the auth_token cookie from the browser
// Call this synchronously whenever a session mismatch is detected
export function clearAuthCookie() {
  document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax;"
}

export async function handleLogout() {
  // 1. Clear the cookie IMMEDIATELY (synchronous) so middleware stops trusting it
  clearAuthCookie()

  // 2. Clear all client-side session data immediately
  localStorage.removeItem("token")
  localStorage.removeItem("staffId")
  localStorage.removeItem("staffName")
  localStorage.removeItem("role")
  localStorage.removeItem("permissions")
  localStorage.removeItem("special_pass")

  // 3. Call logout API in background to clear server-side cookie too
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error calling logout API:", error)
  }

  // 4. Hard redirect to login page (not router.push - to force full reload)
  window.location.href = "/login"
}
