/**
 * What an application may attach, and how a stored link is read back.
 *
 * The wizard used to accept a photograph only, because photographs were the only
 * thing the image host would take. A licence, a trade certificate or a vehicle's
 * papers often arrive as a PDF instead, so documents now travel to the store's
 * own API — and everything that decides what is allowed, or works out what a
 * stored link points at, lives here so the uploader and the review screen can
 * never disagree about it.
 */

/** Eight megabytes, mirroring the API's own cap. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const MAX_UPLOAD_LABEL = "8 MB";

/** The `accept` attribute for a file picker that takes documents. */
export const DOCUMENT_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,application/pdf,.doc,.docx";

/** The types the API will store, kept in step with `file.types` on the server. */
const ALLOWED_DOCUMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const isAllowedDocumentType = (mime: string) =>
  ALLOWED_DOCUMENT_TYPES.includes(mime);

/**
 * An empty type happens when the system cannot place an extension — a file
 * dragged from an unusual source, for instance. The name is the next best
 * evidence, so a `.pdf` is still recognised as a PDF.
 */
export const guessMime = (file: File): string => {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (name.endsWith(".doc")) return "application/msword";
  if (/\.(jpe?g)$/.test(name)) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (/\.(heic|heif)$/.test(name)) return "image/heic";
  return "";
};

export type FileKind = "image" | "pdf" | "other";

const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif|avif|heic|heif|bmp)$/i;
const PDF_EXTENSION = /\.pdf$/i;

const pathOf = (url: string) => url.split(/[?#]/)[0] ?? "";

/**
 * What a stored link points at.
 *
 * Read from the extension rather than from a second field on the record: the
 * links already saved — including the ones an image host handed back before
 * documents were storable — carry their extension, and so do the ones the API
 * now writes. A link with no extension stays "other" and is offered as a
 * download rather than guessed at.
 */
export function fileKindOf(url: string): FileKind {
  const path = pathOf(url);
  if (PDF_EXTENSION.test(path)) return "pdf";
  if (IMAGE_EXTENSION.test(path)) return "image";
  return "other";
}

/** The filename at the end of a stored link, for a label or a download. */
export function fileNameOf(url: string): string {
  const segments = pathOf(url).split("/").filter(Boolean);
  const last = segments[segments.length - 1] || "";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

/**
 * Sends a document to the storefront's own route, which holds the session and
 * the key the API wants. Photographs still go straight to the image host from
 * the uploader; this is the route for everything the host cannot take.
 */
export async function uploadDocument(file: File): Promise<{ url: string; name: string }> {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch("/api/documents", { method: "POST", body });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "The document could not be uploaded.");
  }

  return {
    url: payload.data?.url as string,
    name: (payload.data?.name as string) || file.name,
  };
}
