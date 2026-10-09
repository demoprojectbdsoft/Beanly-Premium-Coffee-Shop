"use client";

import React, { useState, useMemo, useEffect } from "react";
import type { TimeValue } from "@heroui/react";
import type { DateValue } from "@internationalized/date";
import {
  Calendar,
  DateField,
  DatePicker,
  Label,
  ListBox,
  Select,
  Switch,
  TimeField,
} from "@heroui/react";
import {
  fromDate,
  ZonedDateTime,
} from "@internationalized/date";
import {
  Timer,
  Clock,
  Sparkles,
  CheckCircle2,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Globe,
} from "lucide-react";

// UTC+6 Timezone Definition
const TIMEZONE = "Asia/Dhaka";
const TIMEZONE_OFFSET_HOURS = 6;
const TIMEZONE_LABEL = "UTC+6 (Asia/Dhaka)";

type Granularity = "day" | "hour" | "minute" | "second";
type HourCycle = 12 | 24;

const granularityOptions: { label: string; value: Granularity }[] = [
  { label: "Day", value: "day" },
  { label: "Hour", value: "hour" },
  { label: "Minute", value: "minute" },
  { label: "Second", value: "second" },
];

const hourCycleOptions: { label: string; value: HourCycle }[] = [
  { label: "12-hour (AM/PM)", value: 12 },
  { label: "24-hour", value: 24 },
];

interface HeroUIDateTimePickerProps {
  label?: string;
  value?: string | Date | null;
  onChange: (isoString: string) => void;
  helperText?: string;
  showPresets?: boolean;
}

// Convert ISO string or Date to ZonedDateTime in UTC+6
function parseToZonedDateTime(val?: string | Date | null): ZonedDateTime | null {
  if (!val) return null;
  try {
    const d = typeof val === "string" ? new Date(val) : val;
    if (isNaN(d.getTime())) return null;
    return fromDate(d, TIMEZONE);
  } catch {
    return null;
  }
}

// Convert DateValue back to ISO 8601 string
function convertDateValueToIso(val: DateValue | null): string {
  if (!val) return "";
  try {
    if ("toDate" in val && typeof val.toDate === "function") {
      const d = val.toDate(TIMEZONE);
      return !isNaN(d.getTime()) ? d.toISOString() : "";
    }
    const year = val.year;
    const month = val.month;
    const day = val.day;
    const hour = "hour" in val ? (val as { hour: number }).hour : 23;
    const minute = "minute" in val ? (val as { minute: number }).minute : 59;
    const second = "second" in val ? (val as { second: number }).second : 0;

    const utcMs = Date.UTC(
      year,
      month - 1,
      day,
      hour - TIMEZONE_OFFSET_HOURS,
      minute,
      second
    );
    return new Date(utcMs).toISOString();
  } catch {
    return "";
  }
}

// Calculate countdown badge
function calculateCountdown(val?: string | Date | null): {
  text: string;
  isExpired: boolean;
  active: boolean;
} {
  if (!val) return { text: "No countdown set", isExpired: false, active: false };
  const d = typeof val === "string" ? new Date(val) : val;
  if (!d || isNaN(d.getTime())) return { text: "Invalid date", isExpired: false, active: false };

  const diff = d.getTime() - Date.now();
  if (diff <= 0) {
    return { text: "Countdown Expired", isExpired: true, active: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  let text = "";
  if (days > 0) {
    text = `${days}d ${hours}h ${minutes}m left`;
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m left`;
  } else {
    text = `${minutes}m left`;
  }

  return { text, isExpired: false, active: true };
}

// Format human-readable display date in UTC+6
function formatHumanDate(val?: string | Date | null): string {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  if (!d || isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    timeZone: TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function HeroUIDateTimePicker({
  label = "Countdown End Date & Time",
  value,
  onChange,
  helperText,
  showPresets = true,
}: HeroUIDateTimePickerProps) {
  const [granularity, setGranularity] = useState<Granularity>("minute");
  const [hourCycle, setHourCycle] = useState<HourCycle>(12);
  const [hideTimeZone, setHideTimeZone] = useState(false);
  const [shouldForceLeadingZeros, setShouldForceLeadingZeros] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const timeGranularity = granularity !== "day" ? granularity : undefined;
  const showTimeField = Boolean(timeGranularity);

  // Sync dateValue from external value prop
  const dateValue = useMemo<ZonedDateTime | null>(() => {
    return parseToZonedDateTime(value);
  }, [value]);

  const [liveCountdown, setLiveCountdown] = useState(() => calculateCountdown(value));

  // Update countdown live every 30 seconds
  useEffect(() => {
    setLiveCountdown(calculateCountdown(value));
    const interval = setInterval(() => {
      setLiveCountdown(calculateCountdown(value));
    }, 30000);
    return () => clearInterval(interval);
  }, [value]);

  const handleDatePickerChange = (newValue: DateValue | null) => {
    const isoString = convertDateValueToIso(newValue);
    onChange(isoString);
  };

  // Quick Presets in UTC+6
  const handlePresetDays = (days: number) => {
    const target = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    // Set to 23:59:00 UTC+6
    const zoned = fromDate(target, TIMEZONE);
    const updated = zoned.set({
      hour: 23,
      minute: 59,
      second: 0,
    });
    onChange(updated.toDate().toISOString());
  };

  const handleClear = () => {
    onChange("");
  };

  const displayFormatted = formatHumanDate(value);

  return (
    <div className="space-y-3.5 p-4 bg-slate-50/90 dark:bg-gray-800/40 rounded-2xl border border-slate-200/80 dark:border-gray-800/80 shadow-xs transition-all">
      {/* Header & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 shrink-0">
            <Timer className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span>{label}</span>
          </label>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-100/70 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/50 shrink-0">
            <Globe className="w-2.5 h-2.5" />
            {TIMEZONE_LABEL}
          </span>
        </div>

        {liveCountdown.active && (
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs shrink-0 self-start sm:self-auto ${
              liveCountdown.isExpired
                ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
                : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 animate-pulse"
            }`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            {liveCountdown.text}
          </span>
        )}
      </div>

      {/* HeroUI v3 DatePicker Component */}
      <div className="w-full">
        <DatePicker
          key={`${granularity}-${hourCycle}-${hideTimeZone}-${shouldForceLeadingZeros}`}
          className="w-full"
          value={dateValue}
          onChange={handleDatePickerChange}
          granularity={granularity}
          hideTimeZone={hideTimeZone}
          hourCycle={hourCycle}
          shouldForceLeadingZeros={shouldForceLeadingZeros}
        >
          {({ state }) => (
            <>
              <DateField.Group
                fullWidth
                className="w-full min-h-11 px-3 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl flex items-center justify-between text-xs font-semibold text-gray-800 dark:text-gray-100 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 shadow-xs transition-all gap-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto">
                  <Clock className="w-4 h-4 text-sky-500 shrink-0" />
                  <DateField.Input className="flex flex-wrap items-center gap-0.5 outline-none min-w-0">
                    {(segment) => (
                      <DateField.Segment
                        segment={segment}
                        className="px-0.5 rounded outline-none focus:bg-sky-500 focus:text-white shrink-0"
                      />
                    )}
                  </DateField.Input>
                </div>
                <DateField.Suffix className="shrink-0">
                  <DatePicker.Trigger className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <DatePicker.TriggerIndicator />
                  </DatePicker.Trigger>
                </DateField.Suffix>
              </DateField.Group>

              <DatePicker.Popover className="flex flex-col gap-3 p-4 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50 min-w-[280px]">
                <Calendar aria-label={label}>
                  <Calendar.Header className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-gray-800">
                    <Calendar.YearPickerTrigger className="font-bold text-xs hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer flex items-center gap-1">
                      <Calendar.YearPickerTriggerHeading />
                      <Calendar.YearPickerTriggerIndicator />
                    </Calendar.YearPickerTrigger>
                    <div className="flex items-center gap-1">
                      <Calendar.NavButton
                        slot="previous"
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-pointer"
                      />
                      <Calendar.NavButton
                        slot="next"
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-pointer"
                      />
                    </div>
                  </Calendar.Header>

                  <Calendar.Grid className="w-full mt-2">
                    <Calendar.GridHeader>
                      {(day) => (
                        <Calendar.HeaderCell className="text-[11px] font-bold text-gray-400 dark:text-gray-500 text-center py-1">
                          {day}
                        </Calendar.HeaderCell>
                      )}
                    </Calendar.GridHeader>
                    <Calendar.GridBody>
                      {(date) => (
                        <Calendar.Cell
                          date={date}
                          className="text-xs font-semibold text-center p-1 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/50 cursor-pointer aria-selected:bg-sky-600 aria-selected:text-white"
                        />
                      )}
                    </Calendar.GridBody>
                  </Calendar.Grid>

                  <Calendar.YearPickerGrid className="mt-2">
                    <Calendar.YearPickerGridBody>
                      {({ year }) => (
                        <Calendar.YearPickerCell
                          year={year}
                          className="text-xs p-1.5 text-center rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/50 cursor-pointer aria-selected:bg-sky-600 aria-selected:text-white"
                        />
                      )}
                    </Calendar.YearPickerGridBody>
                  </Calendar.YearPickerGrid>
                </Calendar>

                {showTimeField && (
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-gray-800">
                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sky-500" />
                      Time ({TIMEZONE_LABEL})
                    </Label>
                    <TimeField
                      aria-label="Time"
                      granularity={timeGranularity}
                      hideTimeZone={hideTimeZone}
                      hourCycle={hourCycle}
                      shouldForceLeadingZeros={shouldForceLeadingZeros}
                      value={state.timeValue}
                      onChange={(v) => state.setTimeValue(v as TimeValue)}
                    >
                      <TimeField.Group
                        variant="secondary"
                        className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700"
                      >
                        <TimeField.Input className="flex items-center gap-0.5 outline-none">
                          {(segment) => <TimeField.Segment segment={segment} />}
                        </TimeField.Input>
                      </TimeField.Group>
                    </TimeField>
                  </div>
                )}
              </DatePicker.Popover>
            </>
          )}
        </DatePicker>
      </div>

      {/* Selected Date Preview & Clear Button */}
      {displayFormatted && (
        <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900/80 px-3.5 py-2 rounded-xl border border-slate-200/70 dark:border-gray-800 shadow-2xs">
          <span className="flex items-center gap-1.5 font-medium truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span className="truncate">
              Ends at: <strong className="text-gray-900 dark:text-white">{displayFormatted}</strong> ({TIMEZONE_LABEL})
            </span>
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="text-rose-500 hover:text-rose-600 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer shrink-0 ml-2"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        </div>
      )}

      {/* Quick Presets */}
      {showPresets && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-gray-800/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Quick Add:
            </span>
            {[
              { label: "+1 Day", days: 1 },
              { label: "+3 Days", days: 3 },
              { label: "+7 Days", days: 7 },
              { label: "+14 Days", days: 14 },
              { label: "+30 Days", days: 30 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetDays(preset.days)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700 hover:border-sky-400 dark:hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400 transition-all cursor-pointer shadow-2xs"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Format Options</span>
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      )}

      {/* Advanced Format Options (Granularity, Hour Cycle, TimeZone, Leading Zeros) */}
      {showAdvanced && (
        <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-slate-200/80 dark:border-gray-700/80 space-y-3 mt-2">
          <div className="flex flex-wrap items-center gap-4">
            {/* Granularity Picker */}
            <div className="flex flex-col gap-1">
              <Label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                Granularity
              </Label>
              <Select
                className="w-[120px]"
                value={granularity}
                variant="secondary"
                onChange={(value) => setGranularity(value as Granularity)}
              >
                <Select.Trigger className="h-8 text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl shadow-lg p-1 z-50">
                  <ListBox>
                    {granularityOptions.map((option) => (
                      <ListBox.Item
                        key={option.value}
                        id={option.value}
                        textValue={option.label}
                        className="text-xs px-2.5 py-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-gray-800 cursor-pointer"
                      >
                        {option.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* Hour Cycle Picker */}
            <div className="flex flex-col gap-1">
              <Label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                Hour Cycle
              </Label>
              <Select
                className="w-[140px]"
                value={String(hourCycle)}
                variant="secondary"
                onChange={(value) => setHourCycle(Number(value) as HourCycle)}
              >
                <Select.Trigger className="h-8 text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl shadow-lg p-1 z-50">
                  <ListBox>
                    {hourCycleOptions.map((option) => (
                      <ListBox.Item
                        key={option.value}
                        id={String(option.value)}
                        textValue={option.label}
                        className="text-xs px-2.5 py-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-gray-800 cursor-pointer"
                      >
                        {option.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          </div>

          {/* Switches */}
          <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-slate-100 dark:border-gray-800 text-xs">
            <Switch
              isSelected={hideTimeZone}
              onChange={setHideTimeZone}
              className="text-xs text-gray-600 dark:text-gray-300"
            >
              <Switch.Content className="flex items-center gap-2 cursor-pointer">
                <Switch.Control className="cursor-pointer">
                  <Switch.Thumb />
                </Switch.Control>
                Hide Timezone
              </Switch.Content>
            </Switch>

            <Switch
              isSelected={shouldForceLeadingZeros}
              onChange={setShouldForceLeadingZeros}
              className="text-xs text-gray-600 dark:text-gray-300"
            >
              <Switch.Content className="flex items-center gap-2 cursor-pointer">
                <Switch.Control className="cursor-pointer">
                  <Switch.Thumb />
                </Switch.Control>
                Force Leading Zeros
              </Switch.Content>
            </Switch>
          </div>
        </div>
      )}

      {helperText && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
          {helperText}
        </p>
      )}
    </div>
  );
}
