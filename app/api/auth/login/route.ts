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
      return NextResponse.json({
        token,
        staffId: 0,
        staffName: "Super Admin",
        role: "admin",
        permissions: ["manage_students", "manage_special_pass", "manage_users", "in_out_control", "ban_unban"],
        message: "Login successful",
      })
    }

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1)

    if (!user || user.password !== password) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
    }

    const token = Buffer.from(`${user.id}:${Date.now()}`).toString("base64")

    return NextResponse.json({
      token,
      staffId: user.id,
      staffName: user.name,
      role: user.role,
      permissions: user.permissions,
      message: "Login successful",
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred during login"
    console.error("POST /api/auth/login error:", errorMessage, error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
