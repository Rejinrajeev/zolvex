import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";
import { configFor } from "@/lib/admin-content/configs";

export async function GET(_request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (!configFor(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  const upstream = await callExpress(`/admin/api/content/${type}/${id}`, { method: "GET" });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (!configFor(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  const body = await request.text();
  const upstream = await callExpress(`/admin/api/content/${type}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (!configFor(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  const upstream = await callExpress(`/admin/api/content/${type}/${id}`, { method: "DELETE" });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}
