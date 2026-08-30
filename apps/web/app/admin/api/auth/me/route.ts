import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/admin-auth/cookies";
import { decodeJwtPayload } from "@/lib/admin-auth/jwt";

export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const payload = decodeJwtPayload(accessToken);
  const role = payload?.role;
  if (typeof role !== "string") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ role });
}
