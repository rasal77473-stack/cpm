/**
 * Monthly Leave Auto-Activation Scheduler
 * Runs the auto-activation check every 5 seconds for real-time response
 */

let intervalId: NodeJS.Timeout | null = null
let failureCount = 0
const MAX_FAILURES = 3

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
    // Check if online before attempting fetch
    if (!navigator.onLine) {
      console.warn("⚠️  Cannot trigger auto-activation: offline")
      return
    }

    // For client-side, use relative URL
    const url = `/api/monthly-leave/auto-activate`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    failureCount = 0 // Reset on success

    if (!response.ok) {
      const text = await response.text()
      console.warn(
        `⚠️  Monthly leave auto-activation returned status ${response.status}`
      )
      return
    }

    const data = await response.json()
  } catch (error) {
    failureCount++
    
    // Only log after multiple failures to reduce console spam
    if (failureCount === 1) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`⚠️  Monthly leave auto-activation unavailable: ${message}`)
    } else if (failureCount % 20 === 0) {
      console.warn(`⚠️  Monthly leave auto-activation still unavailable (${failureCount} attempts)`)
    }
    
    // Stop if too many consecutive failures
    if (failureCount > MAX_FAILURES * 5) {
      console.warn("⚠️  Monthly leave scheduler stopped due to persistent connection issues")
      stopMonthlyLeaveScheduler()
    }
  }
}
