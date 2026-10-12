"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

interface SparqLogoProps {
  /**
   * "full"    → Icon + 'parq' wordmark (making "Sparq")
   * "icon"    → Just the S-Cart Icon
   * "stacked" → Icon above wordmark with optional slogan
   */
  variant?: "full" | "icon" | "stacked";
  /**
   * Size presets
   */
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * If true, wraps in a Next.js Link pointing to `/`
   */
  href?: string;
  /**
   * Optional custom className on the wrapper
   */
  className?: string;
  /**
   * Show "Better products. A brighter you." slogan below logo (useful for footer)
   */
  showSlogan?: boolean;
}

export default function SparqLogo({
  variant = "full",
  size = "md",
  href = "/",
  className = "",
  showSlogan = false,
}: SparqLogoProps) {
  // Dimension presets for icon & wordmark
  const sizeConfig = {
    sm: { iconWidth: 28, iconHeight: 24, fontSize: "text-xl", gap: "gap-1.5" },
    md: { iconWidth: 38, iconHeight: 33, fontSize: "text-2xl sm:text-3xl", gap: "gap-2" },
    lg: { iconWidth: 48, iconHeight: 42, fontSize: "text-3xl sm:text-4xl", gap: "gap-2.5" },
    xl: { iconWidth: 64, iconHeight: 56, fontSize: "text-4xl sm:text-5xl", gap: "gap-3" },
  }[size];

  const content = (
    <div
      className={`inline-flex items-center select-none ${
        variant === "stacked" ? "flex-col items-start gap-1" : sizeConfig.gap
      } ${className}`}
    >
      <div className="flex items-center gap-2">
        {/* ── Exact S-Cart Icon ── */}
        <div
          className="relative shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
          style={{ width: sizeConfig.iconWidth, height: sizeConfig.iconHeight }}
        >
          <Image
            src="/sparq-icon.png"
            alt="Sparq"
            width={sizeConfig.iconWidth}
            height={sizeConfig.iconHeight}
            className="w-full h-full object-contain drop-shadow-xs"
            priority
          />
        </div>

        {/* ── Wordmark: parq (Icon acts as 'S' to form SPARQ) ── */}
        {variant !== "icon" && (
          <div className="flex items-center leading-none">
            <span
              className={`font-black tracking-tight text-slate-900 dark:text-white transition-colors duration-200 ${sizeConfig.fontSize}`}
              style={{
                fontFamily: "var(--font-poppins), system-ui, sans-serif",
                letterSpacing: "-0.03em",
              }}
            >
              par
              <span className="relative inline-block">
                q
                {/* Signature angled violet cut on the 'q' tail matching reference */}
                <span
                  className="absolute bottom-[2px] -right-[1px] w-[5px] h-[7px] bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] rounded-xs pointer-events-none transform -skew-x-12"
                  aria-hidden="true"
                />
              </span>
            </span>
          </div>
        )}
      </div>

      {/* ── Optional Slogan: "Better products. A brighter you." ── */}
      {showSlogan && (
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium tracking-tight mt-1">
          Better products. A brighter you.
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group inline-flex items-center shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}
