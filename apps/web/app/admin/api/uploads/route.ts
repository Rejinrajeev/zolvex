import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";

export async function POST(request: Request) {
  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "invalid_upload" }, { status: 400 });
  }

  // A fresh FormData wrapping the *same* File/Blob reference -- not a
  // re-encoded copy of its bytes. callExpress can retry this request once
  // (on a 401, after refreshing the access token), and re-reading a Blob is
  // safe repeatedly, unlike a stream, so this stays retry-safe. The actual
  // bug was never the container; it was function memory (see vercel.json).
  // Round-tripping the file through arrayBuffer() into a brand new Blob
  // held three full copies of it in memory at once and crashed a 256MB
  // function on every real upload.
  const outgoing = new FormData();
  outgoing.set("file", file, file instanceof File ? file.name : "upload");

  const upstream = await callExpress("/admin/api/uploads", {
    method: "POST",
    body: outgoing,
  });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}
