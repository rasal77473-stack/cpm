export async function handleLogout() {
  try {
    // Call logout API to clear server-side auth token cookie
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })

    if (!response.ok) {
      console.error("Logout API error:", response.status)
    }
  } catch (error) {
    console.error("Error calling logout API:", error)
  } finally {
    // Always clear client-side data
    localStorage.removeItem("token")
    localStorage.removeItem("staffId")
    localStorage.removeItem("staffName")
    localStorage.removeItem("role")
    localStorage.removeItem("permissions")
    localStorage.removeItem("special_pass")

    // Redirect to login page
    window.location.href = "/login"
  }
}
