import { NextResponse } from "next/server"
import autoActivateMonthlyLeavePasses from "@/lib/auto-activate-passes"

/**
 * Auto-activate monthly leave passes
 * Can be called by:
 * - A cron job service (external)
 * - The app itself periodically
 * - Manual trigger for testing
 */
export async function POST() {
  try {
    console.log("🚀 Auto-activation endpoint triggered")
    await autoActivateMonthlyLeavePasses()
    
    return NextResponse.json({
      success: true,
      message: "Monthly leave passes auto-activation check completed",
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("❌ Error in auto-activation endpoint:", error)
    return NextResponse.json(
      { 
        error: "Failed to auto-activate passes",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// Allow GET for testing
export async function GET() {
  return POST()
}
