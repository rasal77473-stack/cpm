import { db } from "@/db";
import { users, userActivityLogs } from "@/db/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allUsers = await db.select().from(users);
    // Parse permissions JSON for each user
    const parsedUsers = allUsers.map(user => ({
      ...user,
      permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions
    }));
    return NextResponse.json(parsedUsers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, name, role, permissions, special_pass } = body;

    console.log("POST /api/users - Received body:", body);

    if (!username || !password || !name) {
      console.log("POST /api/users - Missing required fields:", { username: !!username, password: !!password, name: !!name });
      return NextResponse.json({ error: "Missing required fields: username, password, name" }, { status: 400 });
    }

    const userData = {
      username,
      password,
      name,
      role: role || "mentor",
      // Convert permissions array to JSON string for storage
      permissions: JSON.stringify(permissions || ["view_only"]),
      specialPass: special_pass || "NO",
    };

    console.log("POST /api/users - Creating user with data:", userData);

    const newUser = await db.insert(users).values(userData).returning();

    console.log("POST /api/users - User created:", newUser);

    // Parse permissions back to array for response
    return NextResponse.json({
      ...newUser[0],
      permissions: JSON.parse(newUser[0].permissions)
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/users - Create user error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to create user: ${errorMessage}` }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, username, password, name, role, permissions, special_pass } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const updatedUser = await db.update(users)
      .set({
        username,
        password,
        name,
        role,
        // Convert permissions array to JSON string for storage
        permissions: JSON.stringify(permissions),
        specialPass: special_pass
      })
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser || updatedUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse permissions back to array for response
    return NextResponse.json({
      ...updatedUser[0],
      permissions: JSON.parse(updatedUser[0].permissions)
    });
  } catch (error) {
    console.error("PUT /api/users - Update error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const userId = parseInt(id);

    // Delete associated activity logs first to avoid FK constraints
    await db.delete(userActivityLogs).where(eq(userActivityLogs.userId, userId));

    // Note: If you have specialPassGrants tied to this user, you might need to handle them too.
    // Assuming specialPassGrants don't have a strict ON DELETE constraint or you want to keep history.
    // If deletion fails due to specialPassGrants, we need to decide whether to cascade or nullify.

    await db.delete(users).where(eq(users.id, userId));
    return NextResponse.json({ success: true, message: "User deleted" });
  } catch (error) {
    console.error("DELETE /api/users error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete user";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
