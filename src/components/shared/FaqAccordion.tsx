"use client";

import React from "react";
import { Accordion } from "@heroui/react";
import { ChevronDown, HelpCircle, type LucideIcon } from "lucide-react";

/**
 * The FAQ every pitch page reads from.
 *
 * HeroUI's own accordion rather than a `<details>` list: the panel animates its
 * height, the chevron turns with the state, and the trigger is a real button —
 * so a question can be opened with the keyboard, announced as expanded, and
 * closed again without the page writing any of that itself.
 *
 * Each question carries its own icon, because a reader scanning six questions
 * finds "trade licence" by its glyph long before they read the words.
 */

export interface FaqItem {
  question: string;
  answer: string;
  /** The glyph beside the question; a plain help mark when none is given. */
  icon?: LucideIcon;
}

interface FaqAccordionProps {
  items: FaqItem[];
  /**
   * Index of the question open on first paint.
   *
   * One answer already showing is what tells a visitor the list opens — an all
   * collapsed stack reads like a wall of text that goes nowhere. Pass `null` to
   * start closed.
   */
  defaultOpen?: number | null;
  /** Let more than one answer stay open at once; on for a short FAQ. */
  allowsMultipleExpanded?: boolean;
}

export default function FaqAccordion({
  items,
  defaultOpen = 0,
  allowsMultipleExpanded = true,
}: FaqAccordionProps) {
  const openKeys =
    defaultOpen === null || defaultOpen < 0 || defaultOpen >= items.length
      ? []
      : [String(defaultOpen)];

  return (
    <Accordion
      allowsMultipleExpanded={allowsMultipleExpanded}
      defaultExpandedKeys={openKeys}
      hideSeparator
      className="flex flex-col gap-2.5"
    >
      {items.map((item, index) => {
        const Icon = item.icon ?? HelpCircle;
        const key = String(index);

        return (
          <Accordion.Item
            key={item.question}
            id={key}
            className="group rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs overflow-hidden transition-colors hover:border-[var(--brand-flat)]/35"
          >
            <Accordion.Heading>
              <Accordion.Trigger className="w-full items-center gap-3 px-4 py-3.5 text-start text-[13px] font-bold text-[var(--foreground)] hover:bg-[var(--surface-alt)]/50">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-flat)]/12 text-[var(--brand-flat)] transition-all group-data-[expanded]:bg-brand-gradient group-data-[expanded]:text-[var(--on-grad-text)] group-data-[expanded]:shadow-xs">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">{item.question}</span>
                <Accordion.Indicator className="shrink-0 text-[var(--foreground-muted)]">
                  <ChevronDown className="size-4" />
                </Accordion.Indicator>
              </Accordion.Trigger>
            </Accordion.Heading>

            <Accordion.Panel>
              <Accordion.Body className="px-4 pt-0 pb-4 text-[12px] leading-relaxed text-[var(--foreground-muted)]">
                <span className="block sm:pl-11">{item.answer}</span>
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}
