import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";
import { isKnownTrashType } from "@/lib/admin-content/trash-types";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  if (!isKnownTrashType(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  const upstream = await callExpress(
    `/admin/api/trash/${type}/${id}/restore`,
    { method: "POST" }
  );
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, {
    status: upstream.status,
  });
}
