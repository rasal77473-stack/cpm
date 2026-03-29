import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      message: "Logout successful",
    })

    // Clear the authentication token cookie
    response.cookies.set("auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // This immediately expires the cookie
    })

    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred during logout"
    console.error("POST /api/auth/logout error:", errorMessage, error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
