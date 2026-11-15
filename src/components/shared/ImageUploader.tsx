"use client";

import React, { useRef, useState } from "react";
import { Input } from "@heroui/react";
import { Upload, Link2, X, Loader2, ImageIcon, FileText } from "lucide-react";
import {
  DOCUMENT_ACCEPT,
  fileNameOf,
  fileKindOf,
  guessMime,
  isAllowedDocumentType,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  uploadDocument,
} from "@/lib/files";

// ─── Read the ImgBB API key from the environment variable ────────────────────
// Set NEXT_PUBLIC_IMGBB_API_KEY in your .env.local file
const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY ?? "";

// ─── Upload a single image file to ImgBB and return its hosted URL ───────────
async function uploadToImgBB(file: File): Promise<string> {
  const body = new FormData();
  body.append("image", file);

  const response = await fetch(
    `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
    { method: "POST", body }
  );

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error?.message ?? "Upload failed");
  }

  // ImgBB returns the hosted image URL here
  return data.data.url as string;
}

// ─── Component Props ─────────────────────────────────────────────────────────
interface ImageUploaderProps {
  label: string;           // Label text shown above the uploader
  value: string;           // The current image URL (empty string if none)
  onChange: (url: string) => void; // Called whenever the image URL changes
  required?: boolean;      // Show a required asterisk on the label
  name?: string;           // HTML form field name (for FormData)
  urlPlaceholder?: string; // Placeholder text for the URL input tab
  /** Hide the URL tab, so the only way in is a file from the device. */
  allowUrl?: boolean;
  /** A shorter drop zone, for forms that stack several uploaders side by side. */
  compact?: boolean;
  /** One line of help under the label, e.g. what the reviewer wants to see. */
  hint?: string;
  /**
   * What the field takes: an illustration, or a document.
   *
   * `"document"` widens the picker to PDFs and Word files as well as photos,
   * and sends anything that is not a photo to the store's own API instead of the
   * image host. An application's licence or trade certificate is as likely to
   * be a PDF as a photograph, and a picker that refuses one is a dead end for
   * the applicant rather than a safeguard.
   */
  accept?: "image" | "document";
}

// ─── ImageUploader Component ─────────────────────────────────────────────────
// This component has two modes the user can switch between:
//   1. "Upload File" — pick a file from device, upload to ImgBB
//   2. "Image URL"  — paste a direct image link
//
// A document field turns the URL mode off (`allowUrl={false}`): a licence photo
// lives in a phone gallery or on a desk scanner, not on a hosting site, so a
// bare link box was never something an applicant could fill in.
//
// After an image is set, a live preview is shown with a remove button.
export default function ImageUploader({
  label,
  value,
  onChange,
  required = false,
  name,
  urlPlaceholder = "https://example.com/image.webp",
  allowUrl = true,
  compact = false,
  hint,
  accept = "image",
}: ImageUploaderProps) {
  // Ref to the hidden <input type="file"> so we can open the file picker
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Which tab is currently active: "upload" or "url"
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");

  // Whether an upload is in progress
  const [isUploading, setIsUploading] = useState(false);

  // Error message shown if upload fails
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Whether the user is dragging a file over the drop zone
  const [isDragOver, setIsDragOver] = useState(false);

  // ── Upload a file ──────────────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    const mime = guessMime(file);

    // A document field takes photos, PDFs and Word files; an illustration field
    // takes photos, because the image host behind it cannot render anything else.
    if (accept === "document") {
      if (!isAllowedDocumentType(mime)) {
        setUploadError("Attach a photo, a PDF or a Word document.");
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setUploadError(`That file is larger than ${MAX_UPLOAD_LABEL}.`);
        return;
      }
    } else if (!mime.startsWith("image/")) {
      setUploadError("Please select a valid image file.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // A photograph still goes straight to the image host; a PDF or a Word file
      // goes to the store's API, which can keep it and serve it back for review.
      const url = mime.startsWith("image/")
        ? await uploadToImgBB(file)
        : (await uploadDocument(file)).url;
      onChange(url);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Upload failed. Please try again.";
      setUploadError(message);
    } finally {
      setIsUploading(false);
      // Reset the file input so the user can re-select the same file later
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Called when the user picks a file using the file picker dialog
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // Called when the user drops a file onto the drop zone
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // Clear the current image and reset state
  const handleRemove = () => {
    onChange("");
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // CSS class for the active tab button
  const activeTabClass =
    "bg-[var(--surface-elevated)] text-primary shadow-xs border border-[var(--border-color)]";

  // CSS class for the inactive tab button
  const inactiveTabClass =
    "text-[var(--foreground-muted)] hover:text-[var(--foreground)]";

  // CSS class for the drop zone (changes when file is dragged over it)
  const dropZoneClass = isDragOver
    ? "border-primary bg-primary/10"
    : "border-[var(--border-color)] bg-[var(--surface-alt)] hover:border-primary/50 hover:bg-primary/5";

  return (
    <div className="flex flex-col gap-2">

      {/* Field label */}
      <label className="text-xs font-semibold text-[var(--foreground)]">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-[10px] text-[var(--foreground-muted)]">{hint}</p>}

      {/* Hidden input so FormData can read the final image URL by field name */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Tab switcher: Upload File | Image URL — only when a URL is allowed */}
      {allowUrl && (
        <div className="flex gap-1 p-1 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "upload" ? activeTabClass : inactiveTabClass
            }`}
          >
            <Upload className="w-3 h-3" />
            Upload File
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "url" ? activeTabClass : inactiveTabClass
            }`}
          >
            <Link2 className="w-3 h-3" />
            Image URL
          </button>
        </div>
      )}

      {/* ── Upload tab: drag-and-drop zone ── */}
      {(!allowUrl || activeTab === "upload") && (
        <div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onKeyDown={(e) =>
              e.key === "Enter" && !isUploading && fileInputRef.current?.click()
            }
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl transition-all cursor-pointer select-none
              ${compact ? "p-3.5 gap-1.5" : "p-6"}
              ${dropZoneClass}
              ${isUploading ? "pointer-events-none opacity-70" : ""}
            `}
          >
            {/* Show spinner while uploading, otherwise show the upload prompt */}
            {isUploading ? (
              <>
                <Loader2 className={`text-primary animate-spin ${compact ? "w-5 h-5" : "w-7 h-7"}`} />
                <p className={`font-semibold text-primary ${compact ? "text-[11px]" : "text-xs"}`}>
                  Uploading…
                </p>
              </>
            ) : (
              <>
                <div
                  className={`rounded-xl bg-primary/10 flex items-center justify-center ${
                    compact ? "w-8 h-8" : "w-10 h-10"
                  }`}
                >
                  {accept === "document" ? (
                    <FileText className={`text-primary ${compact ? "w-4 h-4" : "w-5 h-5"}`} />
                  ) : (
                    <ImageIcon className={`text-primary ${compact ? "w-4 h-4" : "w-5 h-5"}`} />
                  )}
                </div>
                <div className="text-center">
                  <p
                    className={`font-bold text-[var(--foreground)] ${
                      compact ? "text-[11px]" : "text-xs"
                    }`}
                  >
                    Click to browse or drag & drop
                  </p>
                  <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">
                    {accept === "document"
                      ? `JPG, PNG, PDF or DOC — up to ${MAX_UPLOAD_LABEL}`
                      : "PNG, JPG, WEBP, GIF — uploaded to ImgBB"}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Hidden file picker — triggered by clicking the drop zone */}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept === "document" ? DOCUMENT_ACCEPT : "image/*"}
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>
      )}

      {/* ── URL tab: paste an image link ── */}
      {allowUrl && activeTab === "url" && (
        <Input
          placeholder={urlPlaceholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setUploadError(null); // Clear any previous error on new input
          }}
        />
      )}

      {/* Error message shown when upload fails */}
      {uploadError && (
        <p className="text-[10px] font-semibold text-rose-500">{uploadError}</p>
      )}

      {/* Preview — a thumbnail for a photo, a labelled tile for a PDF */}
      {value && !isUploading && (
        <div className="flex items-center gap-3 mt-1 p-2.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)]">
          {/* Thumbnail */}
          <div className="w-16 h-16 rounded-lg overflow-hidden border border-[var(--border-color)] shrink-0 bg-[var(--surface-elevated)]">
            {fileKindOf(value) === "image" ? (
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Hide broken image icon if the URL is invalid
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-primary">
                <FileText className="w-6 h-6" />
              </span>
            )}
          </div>

          {/* URL text + remove button */}
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <p className="text-[10px] text-[var(--foreground-muted)] font-medium">
              {fileKindOf(value) === "image" ? "Uploaded" : fileNameOf(value) || "Document"}
            </p>
            <p className="text-[10px] text-[var(--foreground-muted)] truncate">{value}</p>
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1 text-[10px] font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer w-fit"
            >
              <X className="w-3 h-3" />
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
