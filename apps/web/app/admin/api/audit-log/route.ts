import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  const upstream = await callExpress(`/admin/api/audit-log${search}`, {
    method: "GET",
  });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, {
    status: upstream.status,
  });
}
