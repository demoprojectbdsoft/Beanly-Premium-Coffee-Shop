"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Button as CalendarNavButton,
  CalendarMonthPicker,
  CalendarYearPicker,
} from "react-aria-components";
import AppSelect from "./AppSelect";

/**
 * The month/year jump every calendar in the app shares.
 *
 * A header holding only ‹ › moves one month per click, which is fine for a
 * deal ending next week and useless for a date of birth in 1998 — roughly 340
 * clicks away. React Aria ships CalendarMonthPicker and CalendarYearPicker as
 * render-prop primitives: they read the state of the `<Calendar>` they sit
 * inside, hand back the option list, and re-page the calendar when a choice is
 * made. Wrapping them in AppSelect keeps the dropdowns on the same HeroUI v3
 * control the rest of the form fields use.
 *
 * The year list is 100 entries wide and centred on the focused year, clamped by
 * the calendar's own min/max, so a far-past date is normally a single pick —
 * and picking near an edge recentres the window, so nothing is two picks away.
 *
 * Both pickers answer with a key rather than a date: months are 1-based, years
 * are the position inside the visible window. An empty key means "nothing
 * chosen", which would index past the end of their list, so it is ignored.
 *
 * It has to render inside a `<Calendar>`: the react-aria one AppDatePicker
 * uses, or HeroUI's Calendar, which renders react-aria's underneath.
 */

const NAV_CLASS =
  "grid place-items-center w-7 h-7 shrink-0 rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] cursor-pointer transition-colors [&>svg]:w-4 [&>svg]:h-4";

interface AppCalendarHeaderProps {
  /** Spacing and borders the surrounding calendar wants; the row itself brings none. */
  className?: string;
}

export default function AppCalendarHeader({ className = "" }: AppCalendarHeaderProps) {
  return (
    <header className={`flex items-center gap-1.5 ${className}`}>
      <CalendarNavButton
        slot="previous"
        aria-label="Previous month"
        className={NAV_CLASS}
      >
        <ChevronLeft />
      </CalendarNavButton>

      <CalendarMonthPicker>
        {({ "aria-label": ariaLabel, value, onChange, items }) => (
          <AppSelect
            size="xs"
            ariaLabel={ariaLabel}
            className="w-[92px]"
            value={String(value ?? "")}
            onChange={(key) => {
              if (key) onChange(key);
            }}
            options={items.map((item) => ({
              value: String(item.id),
              label: item.formatted,
            }))}
          />
        )}
      </CalendarMonthPicker>

      <CalendarYearPicker visibleYears={100}>
        {({ "aria-label": ariaLabel, value, onChange, items }) => (
          <AppSelect
            size="xs"
            ariaLabel={ariaLabel}
            className="w-[78px]"
            value={String(value ?? "")}
            onChange={(key) => {
              if (key) onChange(key);
            }}
            options={items.map((item) => ({
              value: String(item.id),
              label: item.formatted,
            }))}
          />
        )}
      </CalendarYearPicker>

      <CalendarNavButton
        slot="next"
        aria-label="Next month"
        className={NAV_CLASS}
      >
        <ChevronRight />
      </CalendarNavButton>
    </header>
  );
}
