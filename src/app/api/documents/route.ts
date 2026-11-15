import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/core/session";
import {
  guessMime,
  isAllowedDocumentType,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
} from "@/lib/files";

/**
 * The door documents come through.
 *
 * A browser cannot post to the API directly and be believed: the key that opens
 * that route lives on the server. So the wizard posts the file here, this route
 * checks that a signed-in account sent it and that the file is the sort of thing
 * an application is allowed to contain, and only then forwards the bytes.
 *
 * The file is forwarded as base64 JSON rather than multipart, which is a third
 * larger on the wire and, in exchange, needs no parser on either side.
 */
export async function POST(request: Request) {
  const user = await getUserSession();

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Sign in before attaching a document." },
      { status: 401 }
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const internalKey = process.env.INTERNAL_API_KEY;

  if (!apiUrl || !internalKey) {
    return NextResponse.json(
      { success: false, message: "File uploads are not configured on this deployment." },
      { status: 500 }
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { success: false, message: "No file arrived. Try choosing it again." },
      { status: 400 }
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { success: false, message: `That file is larger than ${MAX_UPLOAD_LABEL}.` },
      { status: 413 }
    );
  }

  const mime = guessMime(file);

  if (!isAllowedDocumentType(mime)) {
    return NextResponse.json(
      {
        success: false,
        message: "Attach a photo, a PDF or a Word document.",
      },
      { status: 415 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  const response = await fetch(`${apiUrl}/files`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": internalKey,
    },
    body: JSON.stringify({
      name: file.name,
      mime,
      data: bytes.toString("base64"),
      uploadedBy: user.id,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    return NextResponse.json(
      { success: false, message: payload?.message || "The document could not be stored." },
      { status: response.ok ? 502 : response.status }
    );
  }

  return NextResponse.json(payload, { status: 201 });
}
