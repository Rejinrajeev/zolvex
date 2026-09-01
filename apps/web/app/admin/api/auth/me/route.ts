import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/admin-auth/cookies";
import { decodeJwtPayload } from "@/lib/admin-auth/jwt";
import { refreshAccessToken } from "@/lib/admin-auth/proxy";

export async function GET() {
  // The access-token cookie is gone after its 15-minute max-age even while
  // the session is still alive (30-day refresh cookie). Try a refresh before
  // reporting the session dead, so the protected layout doesn't drop the
  // admin to editor-view (or the login screen) just for being idle.
  let accessToken = await getAccessToken();
  if (!accessToken) {
    accessToken = (await refreshAccessToken()) ?? undefined;
  }
  if (!accessToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = decodeJwtPayload(accessToken);
  const role = payload?.role;
  if (typeof role !== "string") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    role,
    mustChangePassword: payload?.mustChangePassword === true,
  });
}
