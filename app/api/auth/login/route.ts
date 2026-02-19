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
        permissions: ["manage_students", "manage_special_pass", "manage_users", "in_out_control", "ban_unban"],
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

    // Parse permissions JSON string to array
    let userPermissions: string[] = ["view_only"];
    try {
      userPermissions = JSON.parse(user.permissions);
    } catch {
      userPermissions = ["view_only"];
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
