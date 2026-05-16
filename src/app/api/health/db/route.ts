import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const start = Date.now();
    await connectDB();
    const elapsed = Date.now() - start;
    return Response.json({
      ok: true,
      db: mongoose.connection.name,
      host: mongoose.connection.host,
      readyState: mongoose.connection.readyState,
      latencyMs: elapsed,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
