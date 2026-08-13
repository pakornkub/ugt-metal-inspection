import { NextResponse } from "next/server";

// Hit by the Dockerfile HEALTHCHECK and docker-compose healthcheck. Checks
// only this process (liveness) — not the backend/AI service, so a downstream
// outage doesn't also mark the frontend container unhealthy and get it
// restarted for no reason.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() }, { status: 200 });
}
