import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";

export async function POST(request: Request) {
  const formData = await request.formData();
  const upstream = await callExpress("/admin/api/uploads", {
    method: "POST",
    body: formData,
  });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}
