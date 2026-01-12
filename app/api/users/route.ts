import { db } from "@/db";
import { users } from "@/db/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allUsers = await db.select().from(users);
    return NextResponse.json(allUsers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, name, role, permissions } = body;

    const newUser = await db.insert(users).values({
      username,
      password, // In a real app, hash this!
      name,
      role,
      permissions,
    }).returning();

    return NextResponse.json(newUser[0]);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, username, password, name, role, permissions } = body;

    const updatedUser = await db.update(users)
      .set({ username, password, name, role, permissions })
      .where(eq(users.id, id))
      .returning();

    return NextResponse.json(updatedUser[0]);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await db.delete(users).where(eq(users.id, parseInt(id)));
    return NextResponse.json({ message: "User deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
