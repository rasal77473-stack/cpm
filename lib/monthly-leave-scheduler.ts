/**
 * Monthly Leave Auto-Activation Scheduler
 * Runs the auto-activation check every minute
 */

let intervalId: NodeJS.Timeout | null = null

export function startMonthlyLeaveScheduler() {
  if (intervalId) {
    console.log("📅 Monthly leave scheduler already running")
    return
  }

  console.log("📅 Starting monthly leave auto-activation scheduler...")

  // Run immediately on start
  triggerAutoActivation()

  // Then run every 10 seconds for faster status updates
  intervalId = setInterval(() => {
    triggerAutoActivation()
  }, 10000) // 10 seconds

  console.log("✅ Monthly leave scheduler started (checks every 10 seconds)")
}

export function stopMonthlyLeaveScheduler() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
    console.log("🛑 Monthly leave scheduler stopped")
  }
}

async function triggerAutoActivation() {
  try {
    // Construct the full URL for the API endpoint
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https"
    const host = process.env.VERCEL_URL || "localhost:3000"
    const url = `${protocol}://${host}/api/monthly-leave/auto-activate`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.warn(
        `⚠️  Monthly leave auto-activation returned status ${response.status}`
      )
    }
  } catch (error) {
    console.error(
      "❌ Failed to trigger monthly leave auto-activation:",
      error instanceof Error ? error.message : String(error)
    )
  }
}
