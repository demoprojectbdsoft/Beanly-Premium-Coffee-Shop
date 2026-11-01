"use client";

import React from "react";
import { Select, ListBox, ListBoxItem } from "@heroui/react";

/**
 * A HeroUI v3 Select that matches the native `<select>` interface the
 * application wizards already use: a string value, a list of options, and an
 * onChange that receives the picked value.
 *
 * The HeroUI Select is built on react-aria-components/Select, so it speaks
 * keys rather than values. This wrapper hides that difference: the `id` of
 * each ListBoxItem is the option's value string, and onSelectionChange reads
 * it back as one. The empty-string "placeholder" option maps to `undefined`
 * inside the picker, which is how react-aria signals "nothing chosen yet".
 */

interface Option {
  value: string;
  label: string;
}

interface AppSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  isDisabled?: boolean;
  ariaLabel?: string;
}

const TRIGGER_CLASS =
  "flex w-full min-w-0 h-10 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--foreground)] items-center justify-between gap-2 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35 data-[open]:border-[var(--brand-flat)]/50";

const VALUE_CLASS =
  "flex-1 truncate text-left text-[var(--foreground)] data-[placeholder]:text-[var(--foreground-muted)]/70";

const LISTBOX_CLASS =
  "max-h-[240px] overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-1 shadow-xl text-[var(--foreground)]";

const ITEM_CLASS =
  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer outline-none transition-colors data-[hovered]:bg-[var(--surface-alt)] data-[hovered]:text-primary data-[selected]:bg-[var(--brand-flat)]/10 data-[selected]:text-[var(--brand-flat)] data-[selected]:font-bold";

export default function AppSelect({
  value,
  onChange,
  options,
  placeholder,
  isDisabled,
  ariaLabel,
}: AppSelectProps) {
  // A blank value means nothing chosen — let react-aria render the placeholder.
  const selectedKey = value || null;

  const handleSelection = (key: React.Key | null) => {
    onChange(key == null ? "" : String(key));
  };

  return (
    <Select.Root
      selectedKey={selectedKey}
      onSelectionChange={handleSelection}
      isDisabled={isDisabled}
      aria-label={ariaLabel}
      placeholder={placeholder || "Choose…"}
      className="w-full min-w-0"
    >
      <Select.Trigger className={TRIGGER_CLASS}>
        <Select.Value className={VALUE_CLASS} />
        <Select.Indicator className="shrink-0 text-[var(--foreground-muted)] [&>svg]:w-4 [&>svg]:h-4" />
      </Select.Trigger>

      <Select.Popover className="p-0 border-none bg-transparent shadow-none">
        <ListBox className={LISTBOX_CLASS}>
          {options.map((opt) => (
            <ListBoxItem key={opt.value} id={opt.value} className={ITEM_CLASS}>
              {opt.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Select.Popover>
    </Select.Root>
  );
}
