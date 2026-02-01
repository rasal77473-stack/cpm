/**
 * Monthly Leave Auto-Activation Scheduler
 * Runs the auto-activation check every 5 seconds for real-time response
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

  // Then run every 5 seconds for real-time status updates
  intervalId = setInterval(() => {
    triggerAutoActivation()
  }, 5000) // 5 seconds

  console.log("✅ Monthly leave scheduler started (checks every 5 seconds)")
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
    // For client-side, use relative URL
    const url = `/api/monthly-leave/auto-activate`
    console.log(`🔄 [${new Date().toLocaleTimeString()}] Triggering auto-activation...`)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    console.log(`✅ Auto-activation API response status: ${response.status}`)

    if (!response.ok) {
      const text = await response.text()
      console.warn(
        `⚠️  Monthly leave auto-activation returned status ${response.status}: ${text.substring(0, 100)}`
      )
      return
    }

    const data = await response.json()
    console.log(`✅ Auto-activation result:`, data.message)
  } catch (error) {
    console.error(
      "❌ Failed to trigger monthly leave auto-activation:",
      error instanceof Error ? error.message : String(error)
    )
  }
}
