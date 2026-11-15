"use client";

import React, { useState } from "react";
import { Modal } from "@heroui/react";
import {
  ExternalLink,
  FileText,
  ImageOff,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { fileNameOf, fileKindOf } from "@/lib/files";

/**
 * A document on an application, opened where it was found.
 *
 * The review screens used to offer "View file" and send the reviewer off the
 * page into a new tab — and once documents became uploads, that tab was an
 * unlabelled image on a hosting site with no way back. A reviewer checking a
 * licence against a plate number is comparing two things at once, so the
 * evidence has to stay inside the file they are reading.
 *
 * Three kinds of file arrive here and each is shown the way a browser can
 * actually show it: a photograph as a photograph, a PDF in the browser's own
 * reader, and a Word file as a labelled download, because pretending a `.docx`
 * can preview is how a review screen ends up with a blank box. Whatever the
 * kind, the new-tab link is always there as the way out.
 */

interface DocumentViewerProps {
  /** What the document is: "Driving licence", "Vehicle papers". */
  label: string;
  href?: string | null;
  /** Shown in place of the tile when nothing was uploaded. */
  emptyText?: string;
  /** A shorter tile, for a grid of several documents. */
  compact?: boolean;
}

type PreviewState = "loading" | "ready" | "failed";

export default function DocumentViewer({
  label,
  href,
  emptyText = "Not provided",
  compact = false,
}: DocumentViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<PreviewState>("loading");
  // A thumbnail can fail on its own — an expired host, a dead link — without the
  // document being gone, so the tile falls back independently of the modal.
  const [tileFailed, setTileFailed] = useState(false);

  const url = href?.trim() || "";
  const kind = fileKindOf(url);
  const name = fileNameOf(url);

  if (!url) {
    return (
      <div
        className={`rounded-xl border border-dashed border-[var(--border-color)] ${
          compact ? "px-3 py-2.5" : "p-3"
        }`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
          {label}
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--foreground-muted)]">{emptyText}</p>
      </div>
    );
  }

  const open = () => {
    // Each opening re-tests the file: a link that failed while the host was
    // having a bad minute should get another go, not a permanent error.
    setState("loading");
    setIsOpen(true);
  };

  const showImage = kind === "image" && !tileFailed;

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="group block w-full cursor-pointer overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-left transition-colors hover:border-[var(--brand-flat)]/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-flat)]/40"
        aria-label={`Open ${label}`}
      >
        <span
          className={`relative flex items-center justify-center overflow-hidden bg-[var(--surface)] ${
            compact ? "h-20" : "h-28"
          }`}
        >
          {showImage ? (
            /* Arbitrary upload hosts and our own API, previewed at the size they
               will be read at. The optimiser would need every host listed up
               front and would re-encode a document it cannot judge, so this
               stays a plain image. */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={url}
              alt={label}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={() => setTileFailed(true)}
            />
          ) : (
            <span className="flex flex-col items-center gap-1 text-[var(--foreground-muted)]">
              <FileText className="h-6 w-6" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {kind === "pdf" ? "PDF" : "File"}
              </span>
            </span>
          )}

          <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/35 group-hover:opacity-100">
            <span className="flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-bold text-slate-900 shadow-xs">
              <Search className="h-3 w-3" />
              View
            </span>
          </span>
        </span>

        <span className="block px-3 py-2">
          <span className="block truncate text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
            {label}
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-semibold text-[var(--brand-flat)]">
            {kind === "image" ? "Open document" : name || "Open document"}
          </span>
        </span>
      </button>

      <Modal
        isOpen={isOpen}
        onOpenChange={(next) => {
          setIsOpen(next);
          if (!next) setState("loading");
        }}
      >
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog className="flex max-h-[92dvh] flex-col rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-2xl">
              <Modal.Header className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] px-5 py-4">
                <div className="min-w-0">
                  <Modal.Heading className="truncate text-base font-extrabold text-[var(--foreground)]">
                    {label}
                  </Modal.Heading>
                  <p className="mt-0.5 truncate text-[11px] text-[var(--foreground-muted)]">
                    {name || "Uploaded with the application"}
                  </p>
                </div>
                <Modal.CloseTrigger className="shrink-0 cursor-pointer rounded-lg p-1 text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]">
                  <X className="h-4 w-4" />
                </Modal.CloseTrigger>
              </Modal.Header>

              <Modal.Body className="overflow-y-auto px-5 py-4">
                {kind === "image" && (
                  <div className="relative flex min-h-[240px] items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-2">
                    {state === "loading" && (
                      <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--foreground-muted)]">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-[11px] font-semibold">Loading the document…</span>
                      </span>
                    )}

                    {state === "failed" && (
                      <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-[var(--foreground-muted)]">
                          <ImageOff className="h-5 w-5" />
                        </span>
                        <p className="text-xs font-bold text-[var(--foreground)]">
                          This preview could not be loaded
                        </p>
                        <p className="max-w-sm text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                          The link may have expired. Open it in a new tab, or ask the applicant to
                          upload it again.
                        </p>
                      </div>
                    )}

                    {/* Kept mounted so the load can finish and flip the state;
                        hidden until it is ready. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={label}
                      className={`max-h-[62dvh] w-auto max-w-full rounded-xl object-contain ${
                        state === "ready" ? "block" : "hidden"
                      }`}
                      onLoad={() => setState("ready")}
                      onError={() => setState("failed")}
                    />
                  </div>
                )}

                {kind === "pdf" && (
                  <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface)]">
                    {/* The browser's own PDF reader: a reviewer gets paging,
                        zoom and print, and nothing has to be re-implemented
                        here. `view=FitH` opens it fitted to the width so a
                        licence fills the frame instead of a postage stamp. */}
                    <iframe
                      src={`${url}#view=FitH`}
                      title={label}
                      className="h-[64dvh] w-full"
                    />
                  </div>
                )}

                {kind === "other" && (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-6 py-10 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-[var(--brand-flat)]">
                      <FileText className="h-6 w-6" />
                    </span>
                    <p className="text-sm font-bold text-[var(--foreground)]">
                      {name || "This file"}
                    </p>
                    <p className="max-w-sm text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                      This kind of file opens in the application that made it. Use the link below to
                      download and read it.
                    </p>
                  </div>
                )}
              </Modal.Body>

              <Modal.Footer className="flex items-center justify-between gap-3 border-t border-[var(--border-color)] px-5 py-4">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--brand-flat)] hover:underline"
                >
                  Open in a new tab
                  <ExternalLink className="h-3 w-3" />
                </a>
                <Modal.CloseTrigger className="cursor-pointer rounded-xl border border-[var(--border-color)] px-4 py-2 text-xs font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]">
                  Close
                </Modal.CloseTrigger>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
