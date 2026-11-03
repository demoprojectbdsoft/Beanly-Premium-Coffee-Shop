"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Download,
  ExternalLink,
  Layers,
} from "lucide-react";

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  productTitle?: string;
}

export default function ImageGalleryModal({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  productTitle = "Product Image Gallery",
}: ImageGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync initialIndex when modal opens or initialIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex >= 0 && initialIndex < images.length ? initialIndex : 0);
      setIsZoomed(false);
    }
  }, [isOpen, initialIndex, images.length]);

  const handlePrev = useCallback(() => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // Keyboard navigation & modal setup
  useEffect(() => {
    if (!isOpen) return;

    // Blur any active element in the background so mobile doesn't require a tap to unfocus
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!mounted || !isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image Gallery"
      className="fixed inset-0 z-[99999] bg-[var(--surface)]/95 dark:bg-black/95 backdrop-blur-2xl flex flex-col justify-between animate-in fade-in duration-200"
    >
      {/* ── Top Header Bar ── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[var(--border-color)] bg-[var(--surface-elevated)]/90 backdrop-blur-md z-20">
        <div className="flex items-center gap-3 min-w-0 pr-4">
          <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-primary/25 shadow-xs">
            <Layers className="w-4 h-4 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-[var(--foreground)] truncate max-w-xs sm:max-w-md md:max-w-xl">
              {productTitle}
            </h3>
            <p className="text-xs font-mono font-semibold text-primary tracking-wide">
              Image {currentIndex + 1} of {images.length}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Zoom Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed((prev) => !prev);
            }}
            aria-label={isZoomed ? "Reset Zoom" : "Zoom In"}
            className="p-2 sm:p-2.5 rounded-xl text-[var(--foreground-muted)] md:hover:text-primary md:hover:bg-[var(--surface-elevated)] active:text-primary active:scale-95 bg-[var(--surface-alt)] border border-[var(--border-color)] transition-all cursor-pointer shadow-xs touch-manipulation"
          >
            {isZoomed ? (
              <ZoomOut className="w-4 h-4 stroke-[2] pointer-events-none" />
            ) : (
              <ZoomIn className="w-4 h-4 stroke-[2] pointer-events-none" />
            )}
          </button>

          {/* Download Current Image */}
          <a
            href={currentImage}
            download
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download image"
            onClick={(e) => e.stopPropagation()}
            className="p-2 sm:p-2.5 rounded-xl text-[var(--foreground-muted)] md:hover:text-primary md:hover:bg-[var(--surface-elevated)] active:text-primary active:scale-95 bg-[var(--surface-alt)] border border-[var(--border-color)] transition-all cursor-pointer shadow-xs touch-manipulation"
          >
            <Download className="w-4 h-4 stroke-[2] pointer-events-none" />
          </a>

          {/* Open Original in New Tab */}
          <a
            href={currentImage}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open original image in new tab"
            onClick={(e) => e.stopPropagation()}
            className="p-2 sm:p-2.5 rounded-xl text-[var(--foreground-muted)] md:hover:text-primary md:hover:bg-[var(--surface-elevated)] active:text-primary active:scale-95 bg-[var(--surface-alt)] border border-[var(--border-color)] transition-all cursor-pointer shadow-xs touch-manipulation"
          >
            <ExternalLink className="w-4 h-4 stroke-[2] pointer-events-none" />
          </a>

          {/* Close Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close Gallery"
            className="p-2 sm:p-2.5 ml-1 rounded-xl bg-[var(--surface-alt)] text-[var(--foreground)] md:hover:bg-rose-600 md:hover:text-white md:hover:border-rose-600 active:bg-rose-600 active:text-white active:scale-95 border border-[var(--border-color)] transition-all cursor-pointer shadow-xs touch-manipulation"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2] pointer-events-none" />
          </button>
        </div>
      </div>

      {/* ── Main Image View Area ── */}
      <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        {/* Previous Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Previous Image"
            className="absolute left-3 sm:left-6 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[var(--surface-elevated)]/95 text-[var(--foreground)] md:hover:bg-primary md:hover:text-white md:hover:border-primary active:bg-primary active:text-white active:scale-90 flex items-center justify-center backdrop-blur-md border border-[var(--border-color)] transition-all md:hover:scale-105 shadow-xl cursor-pointer group touch-manipulation"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.2] pointer-events-none transition-transform md:group-hover:-translate-x-0.5" />
          </button>
        )}

        {/* Active Image */}
        <div
          onClick={() => setIsZoomed((prev) => !prev)}
          className={`relative max-w-full max-h-[72dvh] flex items-center justify-center transition-all duration-300 cursor-pointer touch-manipulation ${
            isZoomed ? "scale-125 cursor-zoom-out" : "cursor-zoom-in"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={currentImage}
            src={currentImage}
            alt={`${productTitle} - Image ${currentIndex + 1}`}
            className="max-h-[70dvh] max-w-[88vw] object-contain rounded-2xl shadow-2xl transition-all duration-300 pointer-events-auto border border-[var(--border-color)]/50"
          />
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Next Image"
            className="absolute right-3 sm:right-6 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[var(--surface-elevated)]/95 text-[var(--foreground)] md:hover:bg-primary md:hover:text-white md:hover:border-primary active:bg-primary active:text-white active:scale-90 flex items-center justify-center backdrop-blur-md border border-[var(--border-color)] transition-all md:hover:scale-105 shadow-xl cursor-pointer group touch-manipulation"
          >
            <ChevronRight className="w-6 h-6 stroke-[2.2] pointer-events-none transition-transform md:group-hover:translate-x-0.5" />
          </button>
        )}
      </div>

      {/* ── Bottom Thumbnails Strip ── */}
      <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[var(--surface-elevated)]/90 backdrop-blur-md z-20">
        {/* `w-max max-w-full` rather than `justify-center`: a centred flex row
            inside a scroll container hides its first and last thumbnail as soon
            as the row is wider than the screen, because the overflow runs off
            both ends and only one of them can be scrolled to. Sized to its own
            content and capped by the screen, the strip still sits in the middle
            when it fits and scrolls normally when it does not. */}
        <div className="flex items-center gap-2.5 w-max max-w-[min(100%,56rem)] mx-auto overflow-x-auto py-1 scrollbar-thin">
          {images.map((img, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZoomed(false);
                  setCurrentIndex(idx);
                }}
                aria-label={`View thumbnail ${idx + 1}`}
                className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer touch-manipulation bg-[var(--surface-alt)] ${
                  isActive
                    ? "border-primary ring-2 ring-primary/40 scale-105 opacity-100 shadow-md shadow-primary/20"
                    : "border-[var(--border-color)] opacity-60 md:hover:opacity-100 md:hover:border-primary/50 active:opacity-100 active:border-primary"
                }`}
              >
                <Image
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized={img.startsWith("http")}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
