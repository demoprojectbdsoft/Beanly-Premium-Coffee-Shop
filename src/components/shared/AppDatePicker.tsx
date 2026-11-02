"use client";

import React from "react";
import { DatePicker } from "@heroui/react";
import {
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DateSegment,
  Dialog,
  Group,
} from "react-aria-components";
import AppCalendarHeader from "./AppCalendarHeader";
import {
  CalendarDate,
  CalendarDateTime,
  parseDate,
  parseDateTime,
  type DateValue,
} from "@internationalized/date";

/**
 * A date field the wizards can trust.
 *
 * HeroUI ships the DatePicker shell (root, trigger, popover) but leaves the
 * editable segments and the calendar itself to react-aria-components, so this
 * wires those parts once and styles them with the same surface tokens every
 * other form control uses. Callers keep working with a plain string — the shape
 * the API stores — and never touch a DateValue: an empty string or a malformed
 * date simply reads as "nothing picked yet" rather than throwing on mount.
 *
 * `withTime` turns the same field into a date-and-minute one, so the coupon
 * desk can drop its browser-native `datetime-local` input and share the
 * calendar, the month/year jump, and the styling instead of running two kinds
 * of date control.
 */

interface AppDatePickerProps {
  /** `YYYY-MM-DD`, or `YYYY-MM-DDTHH:mm` when `withTime` is on. Empty means nothing chosen. */
  value?: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  ariaLabel?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  /** Block future picks, e.g. a licence that has not expired yet. */
  maxValue?: string | null;
  /** Pick a minute as well as a day, and read/write the longer string. */
  withTime?: boolean;
  /** "md" is a form field, "sm" the compact control the coupon desk uses. */
  size?: "sm" | "md";
  className?: string;
}

const controlClassFor = (size: "sm" | "md") =>
  `flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs transition focus-within:ring-2 focus-within:ring-[var(--brand-flat)]/35 ${
    size === "md" ? "h-10 px-3" : "h-9 px-2.5 text-[11px]"
  }`;

const SEGMENT_CLASS =
  "tabular-nums text-[var(--foreground)] data-[placeholder]:text-[var(--foreground-muted)]/70 focus:bg-[var(--brand-flat)]/15 focus:text-[var(--brand-flat)] focus:outline-none rounded px-0.5 caret-transparent";

const pad = (n: number) => String(n).padStart(2, "0");

/** Anything the caller stores becomes a DateValue, or null when it does not read. */
function toDateValue(value: string | null | undefined, withTime: boolean): DateValue | null {
  if (!value) return null;
  const text = value.trim();
  if (withTime) {
    try {
      return parseDateTime(text);
    } catch {
      // A day on its own still reads — the time is simply the start of it.
      const day = toDateValue(text, false);
      if (day) return new CalendarDateTime(day.year, day.month, day.day);
      return fromJsDate(new Date(text), true);
    }
  }
  try {
    return parseDate(text);
  } catch {
    return fromJsDate(new Date(text), false);
  }
}

/** The last resort: a full ISO string, which a caller may hold from the API. */
function fromJsDate(date: Date, withTime: boolean): DateValue | null {
  if (Number.isNaN(date.getTime())) return null;
  return withTime
    ? new CalendarDateTime(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
        date.getHours(),
        date.getMinutes()
      )
    : new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** A picked DateValue becomes the string the draft and API expect. */
function fromValue(date: DateValue | null, withTime: boolean): string | null {
  if (!date) return null;
  const day = `${date.year}-${pad(date.month)}-${pad(date.day)}`;
  if (!withTime) return day;
  const parts = date as Partial<CalendarDateTime>;
  return `${day}T${pad(parts.hour ?? 0)}:${pad(parts.minute ?? 0)}`;
}

export default function AppDatePicker({
  value,
  onChange,
  label,
  ariaLabel,
  isRequired,
  isDisabled,
  maxValue,
  withTime = false,
  size = "md",
  className = "",
}: AppDatePickerProps) {
  const selected = toDateValue(value, withTime);
  const upper = toDateValue(maxValue, false);

  return (
    <DatePicker
      aria-label={label || ariaLabel}
      value={selected}
      onChange={(next) => onChange(fromValue(next, withTime))}
      isDisabled={isDisabled}
      isRequired={isRequired}
      granularity={withTime ? "minute" : undefined}
      hourCycle={withTime ? 24 : undefined}
      className={`w-full min-w-0 space-y-1.5 ${className}`}
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

      <Group className={controlClassFor(size)}>
        <DateInput className="flex min-w-0 flex-wrap items-center gap-0.5 text-xs">
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
            <AppCalendarHeader className="mb-2" />
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
