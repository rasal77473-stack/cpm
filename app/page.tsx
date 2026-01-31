"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Initialize monthly leave auto-activation scheduler
    const initializeScheduler = async () => {
      try {
        // Import the scheduler on client side
        const { startMonthlyLeaveScheduler } = await import("@/lib/monthly-leave-scheduler")
        startMonthlyLeaveScheduler()
      } catch (error) {
        console.error("Failed to initialize scheduler:", error)
      }
    }

    // Check if user is logged in, otherwise redirect to login
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
    } else {
      router.push("/dashboard")
    }

    // Start scheduler
    initializeScheduler()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background" />
  )
}
