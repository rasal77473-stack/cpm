import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    // Default hardcoded admin for bootstrap
    if (username === "admin" && password === "caliph786786") {
      const token = Buffer.from(`admin:${Date.now()}`).toString("base64")

      const response = NextResponse.json({
        token,
        staffId: 1, // Use ID 1 (assumes user with ID 1 exists or is "Super Admin")
        staffName: "Super Admin",
        role: "admin",
        special_pass: "YES",
        permissions: [
          "view_only", "in_out_control", "manage_students",
          "issue_phone_pass", "access_phone_pass", "view_phone_logs", "view_phone_history", "manage_phone_status",
          "issue_gate_pass", "access_gate_pass", "view_gate_logs", "manage_gate_status",
          "manage_punishments", "manage_tallies", "view_tally_reports",
          "manage_rewards", "manage_stars",
          "manage_fines", "manage_fine_types",
          "manage_special_pass",
          "view_admin_panel", "manage_users", "manage_monthly_leave", "manage_reports", "manage_settings",
        ],
        message: "Login successful",
      })

      // Set token as HTTP-only cookie for middleware protection
      response.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      })

      return response
    }

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1)

    if (!user || user.password !== password) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
    }

    const token = Buffer.from(`${user.id}:${Date.now()}`).toString("base64")

    // Parse permissions - handle both text array (from postgres) and JSON string formats
    let userPermissions: string[] = ["view_only"];
    if (Array.isArray(user.permissions)) {
      userPermissions = user.permissions;
    } else if (typeof user.permissions === "string") {
      try {
        const parsed = JSON.parse(user.permissions);
        userPermissions = Array.isArray(parsed) ? parsed : ["view_only"];
      } catch {
        userPermissions = ["view_only"];
      }
    }

    // Safety check for ID 0
    if (!user.id || user.id <= 0) {
      console.error("❌ Login blocked: User has invalid ID 0", user)
      return NextResponse.json({ error: "System Error: Invalid User ID. Contact Support." }, { status: 500 })
    }

    const response = NextResponse.json({
      token,
      staffId: user.id,
      staffName: user.name,
      role: user.role,
      special_pass: user.special_pass || "NO",
      permissions: userPermissions,
      message: "Login successful",
    })

    // Set token as HTTP-only cookie for middleware protection
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred during login"
    console.error("POST /api/auth/login error:", errorMessage, error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
