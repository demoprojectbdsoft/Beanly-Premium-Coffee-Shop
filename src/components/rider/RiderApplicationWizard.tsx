"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bike,
  Calendar,
  Check,
  CircleUser,
  Loader2,
  MapPin,
  Phone,
  Send,
} from "lucide-react";
import type {
  RiderApplicationDraft,
  RiderTimeSlot,
  RiderVehicleType,
  RiderWeekDay,
} from "@/types/rider";
import {
  RIDER_TIMESLOT_OPTIONS,
  RIDER_VEHICLE_OPTIONS,
  RIDER_WEEKDAY_OPTIONS,
} from "@/types/rider";
import { submitRiderApplication } from "@/lib/action/rider";
import { useWizardDraft } from "@/hooks/useWizardDraft";
import AppDatePicker from "@/components/shared/AppDatePicker";
import AppSelect from "@/components/shared/AppSelect";
import ImageUploader from "@/components/shared/ImageUploader";

/**
 * The six-step rider application.
 *
 * A signed-in customer is the whole point: the personal step arrives filled
 * with the name, email and phone the account already holds, and submitting
 * links the application to that same account — the API never creates a second
 * user. The wizard mirrors the vendor form (same layout, same progress rail,
 * same per-step validation) so a customer applying for either role learns the
 * shape once.
 *
 * Drafts persist to `localStorage` between steps, so a refresh or a closed tab
 * never costs the applicant their typing. The server still owns the real
 * record; a rejected applicant's earlier answers come from the API and win
 * over any stale local copy (see `useWizardDraft`).
 */

interface RiderApplicationWizardProps {
  initialDraft: RiderApplicationDraft;
  /** A rejected applicant is applying again; the wording says so. */
  isResubmission?: boolean;
  /** When true the local draft is ignored — the server copy is authoritative. */
  restoreLocal?: boolean;
}

const STORAGE_KEY = "sparq.riderApplicationDraft";

/** A date-of-birth picker never offers tomorrow; captured once per mount. */
const TODAY_ISO = new Date().toISOString().slice(0, 10);

const STEPS = [
  { title: "Personal", blurb: "Who you are", icon: CircleUser },
  { title: "Contact", blurb: "How we reach you, when you work", icon: Phone },
  { title: "Address", blurb: "Where you deliver", icon: MapPin },
  { title: "Vehicle", blurb: "What you ride", icon: Bike },
  { title: "Documents", blurb: "Licence, ID, experience", icon: BadgeCheck },
  { title: "Review", blurb: "Check and submit", icon: Send },
];

const INPUT_CLASS =
  "w-full h-10 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35";
const AREA_CLASS = `${INPUT_CLASS} h-auto min-h-[90px] py-2 resize-y`;

/** One labelled field, so every step looks the same. */
function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--foreground)]">
        {label}
        {required && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-[var(--brand-flat)]"
            title="Required"
            aria-label="required"
          />
        )}
      </span>
      {children}
      {hint && <span className="block text-[10px] text-[var(--foreground-muted)]">{hint}</span>}
    </label>
  );
}

/** A chip the applicant toggles — used for the weekday and time-slot grids. */
function Chip({
  active,
  label,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "border-[var(--brand-flat)] bg-[var(--brand-flat)]/15 text-[var(--brand-flat)]"
          : "border-[var(--border-color)] text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)]"
      }`}
    >
      {label}
    </button>
  );
}

/** The one summary block the review step repeats for each group. */
function SummaryBlock({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value?: string | number | null }[];
}) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-2">
        {title}
      </p>
      <dl className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3 text-[11px]">
            <dt className="text-[var(--foreground-muted)]">{row.label}</dt>
            <dd className="text-right font-semibold text-[var(--foreground)] break-words">
              {row.value === undefined || row.value === null || row.value === "" ? "—" : row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function RiderApplicationWizard({
  initialDraft,
  isResubmission = false,
  restoreLocal = true,
}: RiderApplicationWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  // The confirm checkbox belongs to the submission, not the draft: it starts
  // unchecked every time the wizard mounts so an old tick never carries over.
  const [confirm, setConfirm] = useState(false);

  const { draft, patch, clearDraft } = useWizardDraft<RiderApplicationDraft>(
    STORAGE_KEY,
    initialDraft,
    { enabled: restoreLocal }
  );

  // ── Draft updates ─────────────────────────────────────────────────────────
  const patchPersonal = (next: Partial<RiderApplicationDraft["personalInfo"]>) =>
    patch((current) => ({ ...current, personalInfo: { ...current.personalInfo, ...next } }));

  const patchContact = (next: Partial<RiderApplicationDraft["contactInfo"]>) =>
    patch((current) => ({ ...current, contactInfo: { ...current.contactInfo, ...next } }));

  const patchAddress = (next: Partial<RiderApplicationDraft["serviceAddress"]>) =>
    patch((current) => ({ ...current, serviceAddress: { ...current.serviceAddress, ...next } }));

  const patchVehicle = (next: Partial<RiderApplicationDraft["vehicle"]>) =>
    patch((current) => ({ ...current, vehicle: { ...current.vehicle, ...next } }));

  const patchDocuments = (next: Partial<RiderApplicationDraft["documents"]>) =>
    patch((current) => ({ ...current, documents: { ...current.documents, ...next } }));

  const patchAvailability = (next: Partial<RiderApplicationDraft["availability"]>) =>
    patch((current) => ({ ...current, availability: { ...current.availability, ...next } }));

  const patchExperience = (next: Partial<RiderApplicationDraft["experience"]>) =>
    patch((current) => ({ ...current, experience: { ...current.experience, ...next } }));

  const toggleDay = (day: RiderWeekDay) =>
    patchAvailability({
      days: draft.availability.days.includes(day)
        ? draft.availability.days.filter((d) => d !== day)
        : [...draft.availability.days, day],
    });

  const toggleSlot = (slot: RiderTimeSlot) =>
    patchAvailability({
      slots: draft.availability.slots.includes(slot)
        ? draft.availability.slots.filter((s) => s !== slot)
        : [...draft.availability.slots, slot],
    });

  // ── Step validation ─────────────────────────────────────────────────────────
  const errorFor = (index: number): string | null => {
    if (index === 0) {
      if (draft.personalInfo.fullName.trim().length < 2) return "Enter your full name.";
      if (!/^\S+@\S+\.\S+$/.test(draft.personalInfo.email.trim()))
        return "Enter a valid email address.";
      // The account usually prefills this, but a customer who signed up without
      // a phone has to add one — the team needs a number that reaches the rider.
      if ((draft.personalInfo.phone || "").trim().length < 6)
        return "Enter a phone number so the team can reach you.";
    }
    if (index === 1) {
      const emergencyPhone = draft.contactInfo.emergencyContactPhone?.trim();
      const emergencyName = draft.contactInfo.emergencyContactName?.trim();
      if (Boolean(emergencyPhone) !== Boolean(emergencyName))
        return "Give both a name and a number for the emergency contact, or neither.";
      if (draft.availability.maxDistanceKm == null || Number.isNaN(draft.availability.maxDistanceKm))
        return "Set how far you can ride for one delivery.";
    }
    if (index === 2) {
      if (!draft.serviceAddress.country?.trim()) return "Enter the country you serve.";
      if (!draft.serviceAddress.city?.trim()) return "Enter the city you deliver in.";
    }
    if (index === 3) {
      if (!draft.vehicle.type) return "Choose the vehicle you deliver with.";
      const needsPlate = draft.vehicle.type === "motorcycle" || draft.vehicle.type === "car" || draft.vehicle.type === "scooter";
      if (needsPlate && !draft.vehicle.number?.trim())
        return "Enter the vehicle registration number.";
      if (needsPlate && !draft.vehicle.licenseNumber?.trim())
        return "Enter your driving licence number.";
    }
    return null;
  };

  const goNext = () => {
    const error = errorFor(step);
    if (error) {
      toast.error(error);
      return;
    }
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  };

  const goBack = () => setStep((current) => Math.max(0, current - 1));

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (submitting) return;

    for (let index = 0; index < STEPS.length - 1; index += 1) {
      const error = errorFor(index);
      if (error) {
        setStep(index);
        toast.error(error);
        return;
      }
    }

    if (!confirm) {
      toast.error("Tick the confirmation before you submit.");
      return;
    }

    setSubmitting(true);
    try {
      const result = (await submitRiderApplication({
        personalInfo: {
          fullName: draft.personalInfo.fullName.trim(),
          email: draft.personalInfo.email.trim().toLowerCase(),
          phone: draft.personalInfo.phone?.trim() || "",
          dateOfBirth: draft.personalInfo.dateOfBirth || null,
          nationalId: draft.personalInfo.nationalId?.trim() || "",
          photoUrl: draft.personalInfo.photoUrl?.trim() || "",
        },
        contactInfo: {
          emergencyContactName: draft.contactInfo.emergencyContactName?.trim() || "",
          emergencyContactPhone: draft.contactInfo.emergencyContactPhone?.trim() || "",
          preferredContact: draft.contactInfo.preferredContact || "phone",
        },
        serviceAddress: {
          country: draft.serviceAddress.country?.trim() || "Bangladesh",
          division: draft.serviceAddress.division?.trim() || "",
          city: draft.serviceAddress.city?.trim() || "",
          area: draft.serviceAddress.area?.trim() || "",
          address: draft.serviceAddress.address?.trim() || "",
          postalCode: draft.serviceAddress.postalCode?.trim() || "",
          latitude: draft.serviceAddress.latitude ?? null,
          longitude: draft.serviceAddress.longitude ?? null,
        },
        vehicle: {
          type: draft.vehicle.type,
          number: draft.vehicle.number?.trim() || "",
          licenseNumber: draft.vehicle.licenseNumber?.trim() || "",
          licenseExpiry: draft.vehicle.licenseExpiry || null,
          hasOwnVehicle: draft.vehicle.hasOwnVehicle ?? true,
        },
        documents: {
          drivingLicenseUrl: draft.documents.drivingLicenseUrl?.trim() || "",
          nationalIdUrl: draft.documents.nationalIdUrl?.trim() || "",
          vehicleDocsUrl: draft.documents.vehicleDocsUrl?.trim() || "",
          otherUrl: draft.documents.otherUrl?.trim() || "",
          notes: draft.documents.notes?.trim() || "",
        },
        availability: {
          days: draft.availability.days,
          slots: draft.availability.slots,
          maxDistanceKm: Number(draft.availability.maxDistanceKm) || 15,
          note: draft.availability.note?.trim() || "",
        },
        experience: {
          years: Number(draft.experience.years) || 0,
          previousPlatforms: draft.experience.previousPlatforms?.trim() || "",
          note: draft.experience.note?.trim() || "",
        },
        confirm,
      })) as { success?: boolean; message?: string } | null;

      if (result?.success === false) {
        toast.error(result.message || "The application could not be submitted.");
        return;
      }

      clearDraft();
      toast.success(
        isResubmission ? "Application resubmitted" : "Application submitted for review"
      );
      router.push("/become-a-rider/status");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The application could not be submitted."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step bodies ─────────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required>
              <input
                className={INPUT_CLASS}
                value={draft.personalInfo.fullName}
                onChange={(e) => patchPersonal({ fullName: e.target.value })}
                placeholder="Your legal name"
                autoComplete="name"
              />
            </Field>

            <Field label="Email" hint="The address on your account, used for every update.">
              <input
                className={`${INPUT_CLASS} opacity-70 cursor-not-allowed`}
                value={draft.personalInfo.email}
                readOnly
                tabIndex={-1}
              />
            </Field>

            <Field label="Phone" required hint="Needed to reach you about new jobs.">
              <input
                className={INPUT_CLASS}
                value={draft.personalInfo.phone || ""}
                onChange={(e) => patchPersonal({ phone: e.target.value })}
                placeholder="01XXXXXXXXX"
                autoComplete="tel"
              />
            </Field>

            <Field label="Date of birth">
              <AppDatePicker
                ariaLabel="Date of birth"
                value={draft.personalInfo.dateOfBirth}
                maxValue={TODAY_ISO}
                onChange={(next) => patchPersonal({ dateOfBirth: next })}
              />
            </Field>

            <Field label="National ID / Passport" hint="Optional here; upload a copy in Documents.">
              <input
                className={INPUT_CLASS}
                value={draft.personalInfo.nationalId || ""}
                onChange={(e) => patchPersonal({ nationalId: e.target.value })}
                placeholder="ID number"
              />
            </Field>

            {/* Upload-or-paste, exactly like the rider profile page: someone
                applying from a phone has the photo in their gallery, not on a
                hosting site, so a bare URL box was never usable. */}
            <div className="sm:col-span-2">
              <ImageUploader
                label="Profile photo"
                value={draft.personalInfo.photoUrl || ""}
                onChange={(url) => patchPersonal({ photoUrl: url })}
                urlPlaceholder="https://"
              />
              <p className="mt-1.5 text-[11px] text-[var(--foreground-muted)]">
                A clear face photo helps the review.
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Emergency contact name">
                <input
                  className={INPUT_CLASS}
                  value={draft.contactInfo.emergencyContactName || ""}
                  onChange={(e) => patchContact({ emergencyContactName: e.target.value })}
                  placeholder="Full name"
                />
              </Field>
              <Field label="Emergency contact phone">
                <input
                  className={INPUT_CLASS}
                  value={draft.contactInfo.emergencyContactPhone || ""}
                  onChange={(e) => patchContact({ emergencyContactPhone: e.target.value })}
                  placeholder="01XXXXXXXXX"
                />
              </Field>
              <Field label="Preferred contact">
                <AppSelect
                  ariaLabel="Preferred contact"
                  value={draft.contactInfo.preferredContact || "phone"}
                  onChange={(v) =>
                    patchContact({
                      preferredContact: v as "phone" | "email" | "whatsapp",
                    })
                  }
                  options={[
                    { value: "phone", label: "Phone call" },
                    { value: "email", label: "Email" },
                    { value: "whatsapp", label: "WhatsApp" },
                  ]}
                />
              </Field>
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--foreground)]">
                <Calendar className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
                Days you can work
              </p>
              <div className="flex flex-wrap gap-1.5">
                {RIDER_WEEKDAY_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    active={draft.availability.days.includes(option.value)}
                    onClick={() => toggleDay(option.value)}
                    disabled={submitting}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-[var(--foreground)]">Time slots</p>
              <div className="flex flex-wrap gap-1.5">
                {RIDER_TIMESLOT_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    active={draft.availability.slots.includes(option.value)}
                    onClick={() => toggleSlot(option.value)}
                    disabled={submitting}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Max distance per delivery (km)" required>
                <input
                  type="number"
                  min={0}
                  max={200}
                  className={INPUT_CLASS}
                  value={draft.availability.maxDistanceKm}
                  onChange={(e) =>
                    patchAvailability({ maxDistanceKm: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Availability note" hint="Anything the dispatcher should know.">
                <input
                  className={INPUT_CLASS}
                  value={draft.availability.note || ""}
                  onChange={(e) => patchAvailability({ note: e.target.value })}
                  placeholder="Optional"
                />
              </Field>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Country" required>
                <input
                  className={INPUT_CLASS}
                  value={draft.serviceAddress.country || ""}
                  onChange={(e) => patchAddress({ country: e.target.value })}
                  placeholder="Bangladesh"
                />
              </Field>
              <Field label="Division">
                <input
                  className={INPUT_CLASS}
                  value={draft.serviceAddress.division || ""}
                  onChange={(e) => patchAddress({ division: e.target.value })}
                  placeholder="Dhaka"
                />
              </Field>
              <Field label="City" required>
                <input
                  className={INPUT_CLASS}
                  value={draft.serviceAddress.city || ""}
                  onChange={(e) => patchAddress({ city: e.target.value })}
                  placeholder="Dhaka"
                />
              </Field>
              <Field label="Area / Thana">
                <input
                  className={INPUT_CLASS}
                  value={draft.serviceAddress.area || ""}
                  onChange={(e) => patchAddress({ area: e.target.value })}
                  placeholder="Mirpur"
                />
              </Field>
              <Field label="Postal code">
                <input
                  className={INPUT_CLASS}
                  value={draft.serviceAddress.postalCode || ""}
                  onChange={(e) => patchAddress({ postalCode: e.target.value })}
                  placeholder="1215"
                />
              </Field>
              <Field label="Full street address">
                <input
                  className={INPUT_CLASS}
                  value={draft.serviceAddress.address || ""}
                  onChange={(e) => patchAddress({ address: e.target.value })}
                  placeholder="House, road, landmark"
                />
              </Field>
            </div>
            <p className="text-[10px] text-[var(--foreground-muted)]">
              We use this to pick up nearby orders. You can still deliver across the wider metro.
            </p>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <Field label="Vehicle type" required>
              <AppSelect
                ariaLabel="Vehicle type"
                value={draft.vehicle.type}
                onChange={(v) => patchVehicle({ type: v as RiderVehicleType })}
                options={RIDER_VEHICLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                placeholder="Select vehicle"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Registration / plate number" hint="Not needed for walking or bicycle.">
                <input
                  className={INPUT_CLASS}
                  value={draft.vehicle.number || ""}
                  onChange={(e) => patchVehicle({ number: e.target.value })}
                  placeholder="DHAKA METRO-GH 12-3456"
                />
              </Field>
              <Field label="Driving licence number">
                <input
                  className={INPUT_CLASS}
                  value={draft.vehicle.licenseNumber || ""}
                  onChange={(e) => patchVehicle({ licenseNumber: e.target.value })}
                  placeholder="Licence number"
                />
              </Field>
              <Field label="Licence expiry">
                <AppDatePicker
                  ariaLabel="Licence expiry"
                  value={draft.vehicle.licenseExpiry}
                  onChange={(next) => patchVehicle({ licenseExpiry: next })}
                />
              </Field>
              <Field label="Do you own the vehicle?">
                <AppSelect
                  ariaLabel="Do you own the vehicle?"
                  value={draft.vehicle.hasOwnVehicle ? "yes" : "no"}
                  onChange={(v) => patchVehicle({ hasOwnVehicle: v === "yes" })}
                  options={[
                    { value: "yes", label: "Yes, it is mine" },
                    { value: "no", label: "No, borrowed or rented" },
                  ]}
                />
              </Field>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Driving licence (photo URL)">
                <input
                  className={INPUT_CLASS}
                  value={draft.documents.drivingLicenseUrl || ""}
                  onChange={(e) => patchDocuments({ drivingLicenseUrl: e.target.value })}
                  placeholder="https://"
                />
              </Field>
              <Field label="National ID (photo URL)">
                <input
                  className={INPUT_CLASS}
                  value={draft.documents.nationalIdUrl || ""}
                  onChange={(e) => patchDocuments({ nationalIdUrl: e.target.value })}
                  placeholder="https://"
                />
              </Field>
              <Field label="Vehicle papers (photo URL)">
                <input
                  className={INPUT_CLASS}
                  value={draft.documents.vehicleDocsUrl || ""}
                  onChange={(e) => patchDocuments({ vehicleDocsUrl: e.target.value })}
                  placeholder="https://"
                />
              </Field>
              <Field label="Other document (photo URL)">
                <input
                  className={INPUT_CLASS}
                  value={draft.documents.otherUrl || ""}
                  onChange={(e) => patchDocuments({ otherUrl: e.target.value })}
                  placeholder="https://"
                />
              </Field>
            </div>

            <Field label="Anything else the reviewer should see?">
              <textarea
                className={AREA_CLASS}
                value={draft.documents.notes || ""}
                onChange={(e) => patchDocuments({ notes: e.target.value })}
                placeholder="Optional"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Years of delivery experience">
                <input
                  type="number"
                  min={0}
                  max={60}
                  className={INPUT_CLASS}
                  value={draft.experience.years}
                  onChange={(e) => patchExperience({ years: Number(e.target.value) })}
                />
              </Field>
              <Field label="Platforms you have worked with">
                <input
                  className={INPUT_CLASS}
                  value={draft.experience.previousPlatforms || ""}
                  onChange={(e) => patchExperience({ previousPlatforms: e.target.value })}
                  placeholder="Pathao, Uber Eats, …"
                />
              </Field>
            </div>

            <Field label="Experience note">
              <textarea
                className={AREA_CLASS}
                value={draft.experience.note || ""}
                onChange={(e) => patchExperience({ note: e.target.value })}
                placeholder="Optional"
              />
            </Field>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <SummaryBlock
              title="Personal"
              rows={[
                { label: "Name", value: draft.personalInfo.fullName },
                { label: "Email", value: draft.personalInfo.email },
                { label: "Phone", value: draft.personalInfo.phone },
                { label: "Date of birth", value: draft.personalInfo.dateOfBirth },
              ]}
            />
            <SummaryBlock
              title="Contact & availability"
              rows={[
                { label: "Emergency contact", value: draft.contactInfo.emergencyContactName },
                { label: "Emergency phone", value: draft.contactInfo.emergencyContactPhone },
                { label: "Preferred", value: draft.contactInfo.preferredContact },
                { label: "Days", value: draft.availability.days.join(", ") },
                { label: "Slots", value: draft.availability.slots.join(", ") },
                { label: "Max distance", value: `${draft.availability.maxDistanceKm} km` },
              ]}
            />
            <SummaryBlock
              title="Service address"
              rows={[
                { label: "Country", value: draft.serviceAddress.country },
                { label: "Division", value: draft.serviceAddress.division },
                { label: "City", value: draft.serviceAddress.city },
                { label: "Area", value: draft.serviceAddress.area },
                { label: "Address", value: draft.serviceAddress.address },
              ]}
            />
            <SummaryBlock
              title="Vehicle"
              rows={[
                { label: "Type", value: draft.vehicle.type },
                { label: "Plate", value: draft.vehicle.number },
                { label: "Licence", value: draft.vehicle.licenseNumber },
                { label: "Expiry", value: draft.vehicle.licenseExpiry },
                { label: "Owns vehicle", value: draft.vehicle.hasOwnVehicle ? "Yes" : "No" },
              ]}
            />
            <SummaryBlock
              title="Documents & experience"
              rows={[
                { label: "Driving licence", value: draft.documents.drivingLicenseUrl },
                { label: "National ID", value: draft.documents.nationalIdUrl },
                { label: "Experience", value: `${draft.experience.years} year(s)` },
                { label: "Previous platforms", value: draft.experience.previousPlatforms },
              ]}
            />

            <label className="flex items-start gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
              <input
                type="checkbox"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--brand-flat)] cursor-pointer"
              />
              <span className="text-[11px] text-[var(--foreground)]">
                I confirm the details above are accurate and I am willing to work as a Sparq
                delivery rider. I understand the store team will review this application and may
                ask for clearer documents.
              </span>
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Progress rail */}
      <aside className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Rider application
          </p>
          <p className="mt-1 text-sm font-bold text-[var(--foreground)]">Become a Sparq rider</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-alt)]">
            <div
              className="h-full rounded-full bg-brand-gradient transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-[var(--foreground-muted)]">
            Step {step + 1} of {STEPS.length}
          </p>
        </div>

        <nav className="space-y-1">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            const done = index < step;
            const active = index === step;

            return (
              <button
                key={item.title}
                type="button"
                onClick={() => (index <= step ? setStep(index) : goNext())}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors cursor-pointer ${
                  active
                    ? "bg-[var(--brand-flat)]/12 text-[var(--brand-flat)] border border-[var(--brand-flat)]/25"
                    : "text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] border border-transparent"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                    done
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                      : active
                        ? "bg-brand-gradient text-[var(--on-grad-text)]"
                        : "bg-[var(--surface-alt)] text-[var(--foreground-muted)]"
                  }`}
                >
                  {done ? <Check className="w-3 h-3" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold">{item.title}</span>
                  <span className="block truncate text-[10px] opacity-80">{item.blurb}</span>
                </span>
                <Icon className="ml-auto h-3.5 w-3.5 opacity-50" />
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Step content */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs sm:p-6">
        <header className="mb-5">
          <h2 className="text-base font-bold text-[var(--foreground)]">{STEPS[step].title}</h2>
          <p className="text-[11px] text-[var(--foreground-muted)]">{STEPS[step].blurb}</p>
        </header>

        {renderStep()}

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-color)] pt-4">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0 || submitting}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <Link
              href="/become-a-rider"
              className="rounded-xl px-3 py-2 text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
              Cancel
            </Link>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2 text-xs font-bold text-[var(--on-grad-text)] shadow-xs transition-all hover:shadow-md cursor-pointer"
              >
                Continue
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2 text-xs font-bold text-[var(--on-grad-text)] shadow-xs transition-all hover:shadow-md disabled:opacity-60 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    {isResubmission ? "Resubmit application" : "Submit application"}
                  </>
                )}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
