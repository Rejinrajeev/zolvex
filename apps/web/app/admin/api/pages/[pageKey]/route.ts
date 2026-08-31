import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";
import { isKnownPageKey } from "@/lib/admin-content/page-keys";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pageKey: string }> }
) {
  const { pageKey } = await params;
  if (!isKnownPageKey(pageKey)) {
    return NextResponse.json({ error: "invalid_page_key" }, { status: 400 });
  }
  const upstream = await callExpress(`/admin/api/pages/${pageKey}`, {
    method: "GET",
  });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, {
    status: upstream.status,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ pageKey: string }> }
) {
  const { pageKey } = await params;
  if (!isKnownPageKey(pageKey)) {
    return NextResponse.json({ error: "invalid_page_key" }, { status: 400 });
  }
  const body = await request.text();
  const upstream = await callExpress(`/admin/api/pages/${pageKey}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, {
    status: upstream.status,
  });
}
