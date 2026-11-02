"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Chip } from "@heroui/react";
import {
  BadgeCheck,
  Bike,
  Calendar,
  CircleUser,
  FileText,
  Mail,
  MapPin,
  Phone,
  Save,
  Settings2,
  ShieldCheck,
  Star,
  User,
} from "lucide-react";
import { toast } from "react-toastify";
import ImageUploader from "@/components/shared/ImageUploader";
import AppSelect from "@/components/shared/AppSelect";
import AppDatePicker from "@/components/shared/AppDatePicker";
import { updateUser } from "@/lib/action/user";
import { updateMyRiderProfile } from "@/lib/action/rider";
import { authClient } from "@/lib/auth-client";
import type {
  RiderApplication,
  RiderTimeSlot,
  RiderVehicleType,
  RiderWeekDay,
} from "@/types/rider";
import {
  RIDER_TIMESLOT_OPTIONS,
  RIDER_VEHICLE_OPTIONS,
  RIDER_WEEKDAY_OPTIONS,
} from "@/types/rider";

/**
 * The rider's own profile.
 *
 * Everything the application wizard collected lives here — filled or not — and
 * every one of those answers can be changed, because a renewed licence or a
 * moved house should never need a support ticket. The account row (name, photo,
 * phone, vehicle) is written by the API as a mirror of this file, so dispatch
 * and the customer's tracking screen keep showing the same rider.
 *
 * Availability is deliberately absent: going online or offline is a shift
 * control and it belongs to Settings, where it sits next to the password and
 * the sign-out.
 */

/** Only the account fields this page reads; the API returns the whole user row. */
export interface RiderAccount {
  id: string;
  name: string;
  email: string;
  image: string;
  phone: string;
  bio: string;
  vehicleType: string;
  vehicleNumber: string;
  licenseNumber: string;
  availability: "online" | "offline";
  riderStatus: string;
  memberSince: string;
}

const inputClass =
  "w-full h-10 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35";
const areaClass = `${inputClass} h-auto min-h-[90px] py-2 resize-y`;

/** A date of birth never offers tomorrow; captured once per mount. */
const TODAY_ISO = new Date().toISOString().slice(0, 10);

const STATUS_LABELS: Record<string, string> = {
  approved: "Approved rider",
  pending: "Application pending",
  under_review: "Under review",
  rejected: "Application rejected",
  cancelled: "Application withdrawn",
  none: "No application on file",
};

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  under_review: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
  rejected: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
  cancelled: "bg-[var(--surface-alt)] text-[var(--foreground-muted)] border-[var(--border-color)]",
  none: "bg-[var(--surface-alt)] text-[var(--foreground-muted)] border-[var(--border-color)]",
};

/** One labelled field, so this page looks exactly like the wizard that filled it. */
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

/** A toggleable chip, the same control the wizard uses for days and slots. */
function PickChip({
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

/** A section heading inside the long form. */
function SectionTitle({
  icon: Icon,
  title,
  blurb,
}: {
  icon: React.ElementType;
  title: string;
  blurb: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h3 className="text-base font-bold text-[var(--foreground)]">{title}</h3>
        <p className="text-xs text-[var(--foreground-muted)]">{blurb}</p>
      </div>
    </div>
  );
}

/** The date a file holds, as the day the rider sees it. */
function dayOnly(value?: string | null): string {
  if (!value) return "";
  const text = value.trim();
  if (!text) return "";
  const parsed = new Date(text);
  if (isNaN(parsed.getTime())) return text.slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

interface PersonalForm {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  nationalId: string;
  photoUrl: string;
}

interface ContactForm {
  emergencyContactName: string;
  emergencyContactPhone: string;
  preferredContact: "phone" | "email" | "whatsapp";
}

interface AddressForm {
  country: string;
  division: string;
  city: string;
  area: string;
  postalCode: string;
  address: string;
}

interface VehicleForm {
  type: RiderVehicleType | "";
  number: string;
  licenseNumber: string;
  licenseExpiry: string;
  hasOwnVehicle: boolean;
}

interface DocumentsForm {
  drivingLicenseUrl: string;
  nationalIdUrl: string;
  vehicleDocsUrl: string;
  otherUrl: string;
  notes: string;
}

interface AvailabilityForm {
  days: RiderWeekDay[];
  slots: RiderTimeSlot[];
  maxDistanceKm: number;
  note: string;
}

interface ExperienceForm {
  years: number;
  previousPlatforms: string;
  note: string;
}

/** The file, or the account, whichever actually holds the answer. */
function seed(application: RiderApplication | null, account: RiderAccount) {
  return {
    personal: {
      fullName: application?.personalInfo?.fullName || account.name || "",
      phone: application?.personalInfo?.phone || account.phone || "",
      dateOfBirth: dayOnly(application?.personalInfo?.dateOfBirth),
      nationalId: application?.personalInfo?.nationalId || "",
      photoUrl: application?.personalInfo?.photoUrl || account.image || "",
    } satisfies PersonalForm,
    contact: {
      emergencyContactName: application?.contactInfo?.emergencyContactName || "",
      emergencyContactPhone: application?.contactInfo?.emergencyContactPhone || "",
      preferredContact: application?.contactInfo?.preferredContact || "phone",
    } satisfies ContactForm,
    address: {
      country: application?.serviceAddress?.country || "",
      division: application?.serviceAddress?.division || "",
      city: application?.serviceAddress?.city || "",
      area: application?.serviceAddress?.area || "",
      postalCode: application?.serviceAddress?.postalCode || "",
      address: application?.serviceAddress?.address || "",
    } satisfies AddressForm,
    vehicle: {
      type: (application?.vehicle?.type || account.vehicleType || "") as RiderVehicleType | "",
      number: application?.vehicle?.number || account.vehicleNumber || "",
      licenseNumber: application?.vehicle?.licenseNumber || account.licenseNumber || "",
      licenseExpiry: dayOnly(application?.vehicle?.licenseExpiry),
      hasOwnVehicle: application?.vehicle?.hasOwnVehicle ?? true,
    } satisfies VehicleForm,
    documents: {
      drivingLicenseUrl: application?.documents?.drivingLicenseUrl || "",
      nationalIdUrl: application?.documents?.nationalIdUrl || "",
      vehicleDocsUrl: application?.documents?.vehicleDocsUrl || "",
      otherUrl: application?.documents?.otherUrl || "",
      notes: application?.documents?.notes || "",
    } satisfies DocumentsForm,
    availability: {
      days: application?.availability?.days ?? [],
      slots: application?.availability?.slots ?? [],
      maxDistanceKm: application?.availability?.maxDistanceKm ?? 25,
      note: application?.availability?.note || "",
    } satisfies AvailabilityForm,
    experience: {
      years: application?.experience?.years ?? 0,
      previousPlatforms: application?.experience?.previousPlatforms || "",
      note: application?.experience?.note || "",
    } satisfies ExperienceForm,
  };
}

export default function RiderProfileClient({
  account,
  application,
}: {
  account: RiderAccount;
  application: RiderApplication | null;
}) {
  const router = useRouter();
  // The sidebar badge and the account chip read the session, and a save writes
  // through the store API, which better-auth knows nothing about — so the
  // client session is refetched afterwards. `disableCookieCache` forces the
  // server to re-read the user document instead of answering from its cookie.
  const { refetch } = authClient.useSession();

  const initial = seed(application, account);

  const [personal, setPersonal] = useState<PersonalForm>(initial.personal);
  const [contact, setContact] = useState<ContactForm>(initial.contact);
  const [address, setAddress] = useState<AddressForm>(initial.address);
  const [vehicle, setVehicle] = useState<VehicleForm>(initial.vehicle);
  const [documents, setDocuments] = useState<DocumentsForm>(initial.documents);
  const [availability, setAvailability] = useState<AvailabilityForm>(initial.availability);
  const [experience, setExperience] = useState<ExperienceForm>(initial.experience);
  const [bio, setBio] = useState(account.bio || "");
  const [isSaving, setIsSaving] = useState(false);

  const patchPersonal = (next: Partial<PersonalForm>) =>
    setPersonal((prev) => ({ ...prev, ...next }));
  const patchContact = (next: Partial<ContactForm>) =>
    setContact((prev) => ({ ...prev, ...next }));
  const patchAddress = (next: Partial<AddressForm>) =>
    setAddress((prev) => ({ ...prev, ...next }));
  const patchVehicle = (next: Partial<VehicleForm>) =>
    setVehicle((prev) => ({ ...prev, ...next }));
  const patchDocuments = (next: Partial<DocumentsForm>) =>
    setDocuments((prev) => ({ ...prev, ...next }));
  const patchAvailability = (next: Partial<AvailabilityForm>) =>
    setAvailability((prev) => ({ ...prev, ...next }));
  const patchExperience = (next: Partial<ExperienceForm>) =>
    setExperience((prev) => ({ ...prev, ...next }));

  const toggleDay = (day: RiderWeekDay) =>
    setAvailability((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((row) => row !== day)
        : [...prev.days, day],
    }));

  const toggleSlot = (slot: RiderTimeSlot) =>
    setAvailability((prev) => ({
      ...prev,
      slots: prev.slots.includes(slot)
        ? prev.slots.filter((row) => row !== slot)
        : [...prev.slots, slot],
    }));

  const statusKey = application?.status || account.riderStatus || "none";

  const initials = (personal.fullName.trim() || account.name || "Rider")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!personal.fullName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!address.city.trim()) {
      toast.error("Please add the city you deliver in.");
      return;
    }
    if (!vehicle.type) {
      toast.error("Please pick the vehicle you ride.");
      return;
    }
    if (availability.maxDistanceKm < 0 || availability.maxDistanceKm > 200) {
      toast.error("The maximum distance must be between 0 and 200 km.");
      return;
    }

    setIsSaving(true);
    try {
      const result = (await updateMyRiderProfile({
        personalInfo: {
          fullName: personal.fullName.trim(),
          phone: personal.phone.trim(),
          dateOfBirth: personal.dateOfBirth || null,
          nationalId: personal.nationalId.trim(),
          photoUrl: personal.photoUrl.trim(),
        },
        contactInfo: {
          emergencyContactName: contact.emergencyContactName.trim(),
          emergencyContactPhone: contact.emergencyContactPhone.trim(),
          preferredContact: contact.preferredContact,
        },
        serviceAddress: {
          country: address.country.trim(),
          division: address.division.trim(),
          city: address.city.trim(),
          area: address.area.trim(),
          postalCode: address.postalCode.trim(),
          address: address.address.trim(),
        },
        vehicle: {
          type: vehicle.type,
          number: vehicle.number.trim(),
          licenseNumber: vehicle.licenseNumber.trim(),
          licenseExpiry: vehicle.licenseExpiry || null,
          hasOwnVehicle: vehicle.hasOwnVehicle,
        },
        documents: {
          drivingLicenseUrl: documents.drivingLicenseUrl.trim(),
          nationalIdUrl: documents.nationalIdUrl.trim(),
          vehicleDocsUrl: documents.vehicleDocsUrl.trim(),
          otherUrl: documents.otherUrl.trim(),
          notes: documents.notes.trim(),
        },
        availability: {
          days: availability.days,
          slots: availability.slots,
          maxDistanceKm: Math.round(availability.maxDistanceKm),
          note: availability.note.trim(),
        },
        experience: {
          years: Math.round(experience.years),
          previousPlatforms: experience.previousPlatforms.trim(),
          note: experience.note.trim(),
        },
      })) as { success?: boolean; message?: string } | null;

      if (result?.success === false) {
        toast.error(result.message || "Could not save your rider details.");
        return;
      }

      // The bio is the only account field this page owns outright; name, photo,
      // phone and vehicle are mirrored from the file by the API.
      if (bio.trim() !== (account.bio || "").trim()) {
        await updateUser(account.id, { bio: bio.trim() });
      }

      toast.success("Profile updated.");
      router.refresh();
      refetch({ query: { disableCookieCache: true } });
    } catch {
      toast.error("Could not save your rider details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Rider <span className="text-gradient-primary">Profile</span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Every answer from your application, in one place — change anything and save.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Chip
            size="sm"
            className={`border text-[11px] font-bold ${STATUS_STYLES[statusKey] ?? STATUS_STYLES.none}`}
          >
            {STATUS_LABELS[statusKey] ?? statusKey}
          </Chip>
          <Link
            href="/dashboard/rider/settings"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-bold border border-[var(--border-color)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-alt)] transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            Settings
          </Link>
        </div>
      </div>

      {/* A hand-added rider has no wizard file; the first save opens one. */}
      {!application && (
        <Card className="bg-[var(--surface)] border border-dashed border-[var(--border-color)] rounded-2xl p-4 shadow-xs">
          <p className="flex items-start gap-2 text-[11px] text-[var(--foreground-muted)] leading-relaxed">
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Your account was opened by the store, so no application form is on file. Everything
            you save here starts your rider file — please fill the parts that are still blank.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Identity card ── */}
        <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-5 h-fit lg:sticky lg:top-24">
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 shrink-0 rounded-2xl bg-brand-gradient text-[var(--on-grad-text)] flex items-center justify-center text-lg font-black shadow-xs overflow-hidden">
              {personal.photoUrl ? (
                <Image
                  src={personal.photoUrl}
                  alt={personal.fullName || "Rider"}
                  fill
                  sizes="56px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                initials || <User className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--foreground)] truncate">
                {personal.fullName || "Rider"}
              </p>
              <p className="text-[11px] text-[var(--foreground-muted)] truncate">{account.email}</p>
            </div>
          </div>

          <div className="space-y-2.5 text-[11px]">
            <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{account.email || "No email"}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span>{personal.phone || "No phone yet"}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
              <Bike className="w-3.5 h-3.5 shrink-0" />
              <span>
                {RIDER_VEHICLE_OPTIONS.find((option) => option.value === vehicle.type)?.label ||
                  "No vehicle yet"}
                {vehicle.number && ` · ${vehicle.number}`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{address.city || "No service city yet"}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
              <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Rider since {account.memberSince}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-color)] space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              Your file
            </p>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              Reference{" "}
              <span className="font-bold text-[var(--foreground)]">
                {application?.reference || "not opened yet"}
              </span>
            </p>
            {application?.submittedAt && (
              <p className="text-[11px] text-[var(--foreground-muted)]">
                Applied {dayOnly(application.submittedAt)}
              </p>
            )}
            <p className="text-[10px] text-[var(--foreground-muted)] leading-relaxed">
              Customers see your name, photo and phone while you carry their parcel. Go online or
              offline in{" "}
              <Link
                href="/dashboard/rider/settings"
                className="font-bold text-primary hover:underline"
              >
                Settings
              </Link>
              .
            </p>
          </div>
        </Card>

        {/* ── The whole file, editable ── */}
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
          {/* Personal */}
          <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-5">
            <SectionTitle
              icon={CircleUser}
              title="Personal details"
              blurb="Who you are, as the review desk and the customers see you."
            />

            <ImageUploader
              label="Profile photo"
              value={personal.photoUrl}
              onChange={(url) => patchPersonal({ photoUrl: url })}
              urlPlaceholder="https://"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name" required>
                <input
                  className={inputClass}
                  value={personal.fullName}
                  onChange={(event) => patchPersonal({ fullName: event.target.value })}
                  placeholder="Your legal name"
                  autoComplete="name"
                />
              </Field>

              <Field label="Email" hint="The address on your account, used for every update.">
                <input
                  className={`${inputClass} opacity-70 cursor-not-allowed`}
                  value={account.email}
                  readOnly
                  tabIndex={-1}
                />
              </Field>

              <Field label="Phone" hint="Needed to reach you about new jobs.">
                <input
                  className={inputClass}
                  value={personal.phone}
                  onChange={(event) => patchPersonal({ phone: event.target.value })}
                  placeholder="01XXXXXXXXX"
                  autoComplete="tel"
                />
              </Field>

              <Field label="Date of birth">
                <AppDatePicker
                  ariaLabel="Date of birth"
                  value={personal.dateOfBirth}
                  maxValue={TODAY_ISO}
                  onChange={(next) => patchPersonal({ dateOfBirth: next || "" })}
                />
              </Field>

              <Field label="National ID / Passport" hint="Upload a copy under Documents.">
                <input
                  className={inputClass}
                  value={personal.nationalId}
                  onChange={(event) => patchPersonal({ nationalId: event.target.value })}
                  placeholder="ID number"
                />
              </Field>

              <Field label="Short bio" hint="Shown to the dispatcher with your profile.">
                <input
                  className={inputClass}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Area you cover, hours you work..."
                />
              </Field>
            </div>
          </Card>

          {/* Contact */}
          <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-5">
            <SectionTitle
              icon={Phone}
              title="Contact"
              blurb="Who we call if something goes wrong on a delivery."
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Emergency contact name">
                <input
                  className={inputClass}
                  value={contact.emergencyContactName}
                  onChange={(event) =>
                    patchContact({ emergencyContactName: event.target.value })
                  }
                  placeholder="Full name"
                />
              </Field>
              <Field label="Emergency contact phone">
                <input
                  className={inputClass}
                  value={contact.emergencyContactPhone}
                  onChange={(event) =>
                    patchContact({ emergencyContactPhone: event.target.value })
                  }
                  placeholder="01XXXXXXXXX"
                />
              </Field>
              <Field label="Preferred contact">
                <AppSelect
                  ariaLabel="Preferred contact"
                  value={contact.preferredContact}
                  onChange={(value) =>
                    patchContact({
                      preferredContact: value as ContactForm["preferredContact"],
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
          </Card>

          {/* Service address */}
          <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-5">
            <SectionTitle
              icon={MapPin}
              title="Service area"
              blurb="We use this to pick up nearby orders. You can still deliver across the wider metro."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Country" required>
                <input
                  className={inputClass}
                  value={address.country}
                  onChange={(event) => patchAddress({ country: event.target.value })}
                  placeholder="Bangladesh"
                />
              </Field>
              <Field label="Division">
                <input
                  className={inputClass}
                  value={address.division}
                  onChange={(event) => patchAddress({ division: event.target.value })}
                  placeholder="Dhaka"
                />
              </Field>
              <Field label="City" required>
                <input
                  className={inputClass}
                  value={address.city}
                  onChange={(event) => patchAddress({ city: event.target.value })}
                  placeholder="Dhaka"
                />
              </Field>
              <Field label="Area / Thana">
                <input
                  className={inputClass}
                  value={address.area}
                  onChange={(event) => patchAddress({ area: event.target.value })}
                  placeholder="Mirpur"
                />
              </Field>
              <Field label="Postal code">
                <input
                  className={inputClass}
                  value={address.postalCode}
                  onChange={(event) => patchAddress({ postalCode: event.target.value })}
                  placeholder="1215"
                />
              </Field>
              <Field label="Full street address">
                <input
                  className={inputClass}
                  value={address.address}
                  onChange={(event) => patchAddress({ address: event.target.value })}
                  placeholder="House, road, landmark"
                />
              </Field>
            </div>
          </Card>

          {/* Vehicle */}
          <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-5">
            <SectionTitle
              icon={Bike}
              title="Vehicle & licence"
              blurb="What you ride — the store pairs parcels to the vehicle that fits them."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Vehicle type" required>
                <AppSelect
                  ariaLabel="Vehicle type"
                  value={vehicle.type}
                  onChange={(value) => patchVehicle({ type: value as RiderVehicleType })}
                  options={RIDER_VEHICLE_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  placeholder="Select vehicle"
                />
              </Field>

              <Field
                label="Registration / plate number"
                hint="Not needed for walking or bicycle."
              >
                <input
                  className={inputClass}
                  value={vehicle.number}
                  onChange={(event) => patchVehicle({ number: event.target.value })}
                  placeholder="DHAKA METRO-GH 12-3456"
                />
              </Field>

              <Field label="Driving licence number">
                <input
                  className={inputClass}
                  value={vehicle.licenseNumber}
                  onChange={(event) => patchVehicle({ licenseNumber: event.target.value })}
                  placeholder="Licence number"
                />
              </Field>

              <Field label="Licence expiry">
                <AppDatePicker
                  ariaLabel="Licence expiry"
                  value={vehicle.licenseExpiry}
                  onChange={(next) => patchVehicle({ licenseExpiry: next || "" })}
                />
              </Field>

              <Field label="Do you own the vehicle?">
                <AppSelect
                  ariaLabel="Do you own the vehicle?"
                  value={vehicle.hasOwnVehicle ? "yes" : "no"}
                  onChange={(value) => patchVehicle({ hasOwnVehicle: value === "yes" })}
                  options={[
                    { value: "yes", label: "Yes, it is mine" },
                    { value: "no", label: "No, borrowed or rented" },
                  ]}
                />
              </Field>
            </div>
          </Card>

          {/* Documents */}
          <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-5">
            <SectionTitle
              icon={FileText}
              title="Documents"
              blurb="A renewed licence or a new ID photo goes here; the store re-checks them before your next pickup."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Driving licence (photo URL)">
                <input
                  className={inputClass}
                  value={documents.drivingLicenseUrl}
                  onChange={(event) => patchDocuments({ drivingLicenseUrl: event.target.value })}
                  placeholder="https://"
                />
              </Field>
              <Field label="National ID (photo URL)">
                <input
                  className={inputClass}
                  value={documents.nationalIdUrl}
                  onChange={(event) => patchDocuments({ nationalIdUrl: event.target.value })}
                  placeholder="https://"
                />
              </Field>
              <Field label="Vehicle papers (photo URL)">
                <input
                  className={inputClass}
                  value={documents.vehicleDocsUrl}
                  onChange={(event) => patchDocuments({ vehicleDocsUrl: event.target.value })}
                  placeholder="https://"
                />
              </Field>
              <Field label="Other document (photo URL)">
                <input
                  className={inputClass}
                  value={documents.otherUrl}
                  onChange={(event) => patchDocuments({ otherUrl: event.target.value })}
                  placeholder="https://"
                />
              </Field>
            </div>

            <Field label="Anything else the reviewer should see?">
              <textarea
                className={areaClass}
                value={documents.notes}
                onChange={(event) => patchDocuments({ notes: event.target.value })}
                placeholder="Optional"
              />
            </Field>
          </Card>

          {/* Working days and hours */}
          <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-5">
            <SectionTitle
              icon={Calendar}
              title="When you can work"
              blurb="The preference you set at application. New jobs are offered around these hours."
            />

            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-[var(--foreground)]">Days you can work</p>
              <div className="flex flex-wrap gap-1.5">
                {RIDER_WEEKDAY_OPTIONS.map((option) => (
                  <PickChip
                    key={option.value}
                    label={option.label}
                    active={availability.days.includes(option.value)}
                    onClick={() => toggleDay(option.value)}
                    disabled={isSaving}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-[var(--foreground)]">Time slots</p>
              <div className="flex flex-wrap gap-1.5">
                {RIDER_TIMESLOT_OPTIONS.map((option) => (
                  <PickChip
                    key={option.value}
                    label={option.label}
                    active={availability.slots.includes(option.value)}
                    onClick={() => toggleSlot(option.value)}
                    disabled={isSaving}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Max distance per delivery (km)" required>
                <input
                  type="number"
                  min={0}
                  max={200}
                  className={inputClass}
                  value={availability.maxDistanceKm}
                  onChange={(event) =>
                    patchAvailability({ maxDistanceKm: Number(event.target.value) })
                  }
                />
              </Field>
              <Field label="Availability note" hint="Anything the dispatcher should know.">
                <input
                  className={inputClass}
                  value={availability.note}
                  onChange={(event) => patchAvailability({ note: event.target.value })}
                  placeholder="Optional"
                />
              </Field>
            </div>
          </Card>

          {/* Experience */}
          <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-5">
            <SectionTitle
              icon={Star}
              title="Experience"
              blurb="What you have done before — it helps the store send you the right parcels."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Years of delivery experience">
                <input
                  type="number"
                  min={0}
                  max={60}
                  className={inputClass}
                  value={experience.years}
                  onChange={(event) => patchExperience({ years: Number(event.target.value) })}
                />
              </Field>
              <Field label="Platforms you have worked with">
                <input
                  className={inputClass}
                  value={experience.previousPlatforms}
                  onChange={(event) =>
                    patchExperience({ previousPlatforms: event.target.value })
                  }
                  placeholder="Pathao, Uber Eats, …"
                />
              </Field>
            </div>

            <Field label="Experience note">
              <textarea
                className={areaClass}
                value={experience.note}
                onChange={(event) => patchExperience({ note: event.target.value })}
                placeholder="Optional"
              />
            </Field>
          </Card>

          {/* Save */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[10px] text-[var(--foreground-muted)]">
              <ShieldCheck className="w-3.5 h-3.5" />
              Changes go straight to your rider file; the store is notified of anything that needs
              a re-check.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="submit"
                isDisabled={isSaving}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold h-10 px-5 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Save changes"}</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
