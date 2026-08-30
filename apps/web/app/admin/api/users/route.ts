import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";

export async function GET() {
  const upstream = await callExpress("/admin/api/users", { method: "GET" });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, {
    status: upstream.status,
  });
}

export async function POST(request: Request) {
  const body = await request.text();
  const upstream = await callExpress("/admin/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, {
    status: upstream.status,
  });
}
