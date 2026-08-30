import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";
import { configFor } from "@/lib/admin-content/configs";

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!configFor(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  const { search } = new URL(request.url);
  const upstream = await callExpress(`/admin/api/content/${type}${search}`, { method: "GET" });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}

export async function POST(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!configFor(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  const body = await request.text();
  const upstream = await callExpress(`/admin/api/content/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}
