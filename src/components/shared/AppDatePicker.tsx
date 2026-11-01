"use client";

import React from "react";
import { DatePicker } from "@heroui/react";
import {
  Button as CalendarNavButton,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarHeading,
  DateInput,
  DateSegment,
  Dialog,
  Group,
} from "react-aria-components";
import { CalendarDate, parseDate, type DateValue } from "@internationalized/date";

/**
 * A date field the wizards can trust.
 *
 * HeroUI ships the DatePicker shell (root, trigger, popover) but leaves the
 * editable segments and the calendar itself to react-aria-components, so this
 * wires those parts once and styles them with the same surface tokens every
 * other form control uses. Callers keep working with a plain `YYYY-MM-DD`
 * string — the shape the API stores — and never touch a DateValue: an empty
 * string or a malformed date simply reads as "nothing picked yet" rather than
 * throwing on mount.
 */

interface AppDatePickerProps {
  /** ISO `YYYY-MM-DD` string, or null/empty when nothing is chosen. */
  value?: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  ariaLabel?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  /** Block future picks, e.g. a licence that has not expired yet. */
  maxValue?: string | null;
  className?: string;
}

const CONTROL_CLASS =
  "flex w-full items-center justify-between gap-2 h-10 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs transition focus-within:ring-2 focus-within:ring-[var(--brand-flat)]/35";

const SEGMENT_CLASS =
  "tabular-nums text-[var(--foreground)] data-[placeholder]:text-[var(--foreground-muted)]/70 focus:bg-[var(--brand-flat)]/15 focus:text-[var(--brand-flat)] focus:outline-none rounded px-0.5 caret-transparent";

/** The stored string becomes a DateValue, or null when it is blank/invalid. */
function toCalendarDate(value?: string | null): CalendarDate | null {
  if (!value) return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

/** A picked DateValue becomes the `YYYY-MM-DD` the draft and API expect. */
function fromCalendarDate(date: DateValue | null): string | null {
  if (!date) return null;
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  return `${date.year}-${month}-${day}`;
}

export default function AppDatePicker({
  value,
  onChange,
  label,
  ariaLabel,
  isRequired,
  isDisabled,
  maxValue,
  className = "",
}: AppDatePickerProps) {
  const selected = toCalendarDate(value);
  const upper = toCalendarDate(maxValue);

  return (
    <DatePicker
      aria-label={label || ariaLabel}
      value={selected}
      onChange={(next) => onChange(fromCalendarDate(next))}
      isDisabled={isDisabled}
      isRequired={isRequired}
      className={`space-y-1.5 ${className}`}
    >
      {label && (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--foreground)]">
          {label}
          {isRequired && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-[var(--brand-flat)] inline-block"
              title="Required"
              aria-label="required"
            />
          )}
        </span>
      )}

      <Group className={CONTROL_CLASS}>
        <DateInput className="flex items-center gap-0.5 text-xs">
          {(segment) => <DateSegment segment={segment} className={SEGMENT_CLASS} />}
        </DateInput>
        <DatePicker.Trigger
          isDisabled={isDisabled}
          aria-label="Open calendar"
          className="shrink-0 grid place-items-center w-6 h-6 rounded-md text-[var(--foreground-muted)] hover:text-[var(--brand-flat)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          <DatePicker.TriggerIndicator className="[&>svg]:w-4 [&>svg]:h-4" />
        </DatePicker.Trigger>
      </Group>

      <DatePicker.Popover className="p-0 border-none shadow-xl bg-transparent">
        <Dialog className="outline-none p-0">
          <Calendar
            aria-label={label || ariaLabel || "Choose a date"}
            maxValue={upper ?? undefined}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 text-[var(--foreground)]"
          >
            <header className="flex items-center justify-between mb-2">
              <CalendarNavButton
                slot="previous"
                aria-label="Previous month"
                className="grid place-items-center w-7 h-7 rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
              >
                ‹
              </CalendarNavButton>
              <CalendarHeading className="text-xs font-bold" />
              <CalendarNavButton
                slot="next"
                aria-label="Next month"
                className="grid place-items-center w-7 h-7 rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
              >
                ›
              </CalendarNavButton>
            </header>
            <CalendarGrid className="border-spacing-1">
              <CalendarGridHeader>
                {(day) => (
                  <CalendarHeaderCell className="text-[10px] font-semibold text-[var(--foreground-muted)] w-7 h-7">
                    {day}
                  </CalendarHeaderCell>
                )}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => (
                  <CalendarCell
                    date={date}
                    className="w-7 h-7 outline-none rounded-lg text-[11px] font-medium grid place-items-center cursor-pointer text-[var(--foreground)] hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--brand-flat)]/50 data-selected:bg-[var(--brand-flat)] data-selected:text-white data-selected:hover:bg-[var(--brand-flat)] data-outside-visible-month:text-[var(--foreground-muted)]/50 data-disabled:opacity-40 data-disabled:cursor-not-allowed"
                  />
                )}
              </CalendarGridBody>
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </DatePicker.Popover>
    </DatePicker>
  );
}
