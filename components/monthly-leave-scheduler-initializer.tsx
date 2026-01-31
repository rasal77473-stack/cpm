"use client"

import { useEffect } from "react"

export function MonthlyLeaveSchedulerInitializer() {
  useEffect(() => {
    const initializeScheduler = async () => {
      try {
        console.log("🔧 Initializing Monthly Leave Scheduler...")
        const { startMonthlyLeaveScheduler } = await import("@/lib/monthly-leave-scheduler")
        startMonthlyLeaveScheduler()
        console.log("✅ Monthly Leave Scheduler initialized successfully")
      } catch (error) {
        console.error("❌ Failed to initialize scheduler:", error)
      }
    }

    // Start scheduler when component mounts
    initializeScheduler()

    // Cleanup on unmount
    return () => {
      // Optionally stop the scheduler when component unmounts
      // This won't happen often since it's in the layout
    }
  }, [])

  // This component doesn't render anything
  return null
}
