import { type NextRequest, NextResponse } from "next/server"

// Mock staff database - Replace with actual database query
const STAFF_DB = {
  admin: {
    id: 1,
    name: "Admin User",
    password: "caliph786786", // In production, this would be hashed
    role: "admin",
  },
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ message: "Username and password are required" }, { status: 400 })
    }

    const staff = STAFF_DB[username as keyof typeof STAFF_DB]

    if (!staff || staff.password !== password) {
      return NextResponse.json({ message: "Invalid username or password" }, { status: 401 })
    }

    // In production, create a proper JWT token
    const token = Buffer.from(`${staff.id}:${Date.now()}`).toString("base64")

    return NextResponse.json({
      token,
      staffId: staff.id,
      staffName: staff.name,
      role: (staff as any).role || "staff",
      message: "Login successful",
    })
  } catch (error) {
    return NextResponse.json({ message: "An error occurred during login" }, { status: 500 })
  }
}
