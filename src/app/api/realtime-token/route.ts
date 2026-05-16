import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongoose";
import { Workspace } from "@/lib/models/workspace";
import { userCanAccessWorkspace } from "@/lib/workspace-access";
import { signRealtimeToken } from "@/lib/realtime/token";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspace");
  if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
    return NextResponse.json(
      { error: "Missing or invalid workspace id" },
      { status: 400 },
    );
  }

  await connectDB();
  const ws = await Workspace.findById(workspaceId).lean();
  if (!ws) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const userObjectId = new mongoose.Types.ObjectId(session.user.id);
  if (!userCanAccessWorkspace(ws, userObjectId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = await signRealtimeToken({
    userId: session.user.id,
    workspaceId,
  });

  return NextResponse.json({ token });
}
