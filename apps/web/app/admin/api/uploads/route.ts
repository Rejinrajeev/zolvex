import { NextResponse } from "next/server";
import { callExpress, parseJsonSafe } from "@/lib/admin-auth/proxy";

export async function POST(request: Request) {
  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "invalid_upload" }, { status: 400 });
  }

  // Rebuild the multipart body from the file's raw bytes rather than
  // forwarding the FormData Next.js parsed off the *incoming* request.
  // Re-streaming a File/Blob that belongs to one request as the body of a
  // second, outgoing fetch() is unreliable in Vercel's serverless runtime --
  // it worked under `next dev` but crashed the function in production
  // (502, no error body) every time an image was uploaded.
  const bytes = await file.arrayBuffer();
  const outgoing = new FormData();
  const filename = file instanceof File ? file.name : "upload";
  outgoing.set("file", new Blob([bytes], { type: file.type }), filename);

  const upstream = await callExpress("/admin/api/uploads", {
    method: "POST",
    body: outgoing,
  });
  const data = await parseJsonSafe(upstream);
  return NextResponse.json(data ?? { error: "upstream_error" }, { status: upstream.status });
}
