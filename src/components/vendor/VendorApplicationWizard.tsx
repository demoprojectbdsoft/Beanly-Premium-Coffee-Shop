"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CircleUser,
  Loader2,
  MapPin,
  MapPinned,
  Send,
  Store,
  Warehouse,
} from "lucide-react";
import type {
  BillingCycle,
  VendorApplicationDraft,
  VendorPlanId,
  VendorWarehouse,
} from "@/types/vendor";
import { VENDOR_BUSINESS_TYPES } from "@/types/vendor";
import { submitVendorApplication } from "@/lib/action/vendor";
import { useWizardDraft } from "@/hooks/useWizardDraft";
import AppSelect from "@/components/shared/AppSelect";
import ImageUploader from "@/components/shared/ImageUploader";

/**
 * The five-step application.
 *
 * A customer who is already signed in is the whole point: the personal step
 * arrives filled with the name, email and phone the account already holds, so
 * applying never asks for something the store already knows. Submitting links
 * the application to that same account — the API never creates a second user.
 *
 * The subscription plan is handled after approval in the vendor dashboard's
 * Plan & Billing desk.
 */

interface VendorApplicationWizardProps {
  initialDraft: VendorApplicationDraft;
  storeName?: string;
  /** A rejected applicant is applying again; the wording says so. */
  isResubmission?: boolean;
}

const STORAGE_KEY = "sparq.vendorApplicationDraft";

const STEPS = [
  { title: "Personal", blurb: "Who is behind the store", icon: CircleUser },
  { title: "Store", blurb: "How buyers will see you", icon: Store },
  { title: "Address", blurb: "Where the store operates", icon: MapPin },
  { title: "Verification", blurb: "Documents, if you have them", icon: BadgeCheck },
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
      {hint && (
        <span className="block text-[10px] text-[var(--foreground-muted)]">{hint}</span>
      )}
    </label>
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

/** The store link the API will derive, shown before it is saved. */
function slugPreview(name: string, slug: string): string {
  return (slug || name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function VendorApplicationWizard({
  initialDraft,
  storeName,
  isResubmission = false,
}: VendorApplicationWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  // A first-time applicant gets their in-progress answers back after a refresh;
  // a resubmission is driven by the server copy, so the stale local draft is not
  // restored over it (see `useWizardDraft`).
  const { draft, patch: setDraft, clearDraft } = useWizardDraft<VendorApplicationDraft>(
    STORAGE_KEY,
    initialDraft,
    { enabled: !isResubmission }
  );

  const linkedStore = slugPreview(draft.storeInfo.name, draft.storeInfo.slug);

  // ── Draft updates ───────────────────────────────────────────────────────────
  const patchPersonal = (patch: Partial<VendorApplicationDraft["personalInfo"]>) =>
    setDraft((current) => ({
      ...current,
      personalInfo: { ...current.personalInfo, ...patch },
    }));

  const patchStore = (patch: Partial<VendorApplicationDraft["storeInfo"]>) =>
    setDraft((current) => ({
      ...current,
      storeInfo: { ...current.storeInfo, ...patch },
    }));

  const patchAddress = (patch: Partial<VendorApplicationDraft["businessAddress"]>) =>
    setDraft((current) => ({
      ...current,
      businessAddress: { ...current.businessAddress, ...patch },
    }));

  const patchWarehouse = (patch: Partial<VendorWarehouse>) =>
    setDraft((current) => ({
      ...current,
      warehouseAddress: { ...(current.warehouseAddress || {}), ...patch },
    }));

  const patchVerification = (patch: Partial<VendorApplicationDraft["verification"]>) =>
    setDraft((current) => ({
      ...current,
      verification: { ...current.verification, ...patch },
    }));

  // ── Step validation ─────────────────────────────────────────────────────────
  // One rule set, defined once in `stepErrorFor` below: the Next button checks
  // the current step, and the final submit walks every step with the same
  // function, so a rule can never be live in one place and missing in the other.
  const stepError = (): string | null => stepErrorFor(step, draft, linkedStore);

  const goNext = () => {
    const error = stepError();
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
      if (stepErrorFor(index, draft, linkedStore)) {
        setStep(index);
        toast.error(stepErrorFor(index, draft, linkedStore) as string);
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = (await submitVendorApplication({
        personalInfo: {
          fullName: draft.personalInfo.fullName.trim(),
          email: draft.personalInfo.email.trim().toLowerCase(),
          phone: draft.personalInfo.phone?.trim() || "",
          contactInfo: draft.personalInfo.contactInfo?.trim() || "",
        },
        storeInfo: {
          name: draft.storeInfo.name.trim(),
          slug: linkedStore,
          description: draft.storeInfo.description?.trim() || "",
          logo: draft.storeInfo.logo?.trim() || "",
          coverImage: draft.storeInfo.coverImage?.trim() || "",
          email: draft.storeInfo.email?.trim() || "",
          phone: draft.storeInfo.phone?.trim() || "",
          category: draft.storeInfo.category?.trim() || "",
          website: draft.storeInfo.website?.trim() || "",
          socialLinks: draft.storeInfo.socialLinks || {},
        },
        businessAddress: {
          country: draft.businessAddress.country?.trim() || "Bangladesh",
          division: draft.businessAddress.division?.trim() || "",
          city: draft.businessAddress.city?.trim() || "",
          area: draft.businessAddress.area?.trim() || "",
          address: draft.businessAddress.address?.trim() || "",
          postalCode: draft.businessAddress.postalCode?.trim() || "",
        },
        // Optional: an empty street here means the rider collects from the
        // business address, which is what the API falls back to by itself.
        warehouseAddress: {
          label: draft.warehouseAddress?.label?.trim() || "",
          address: draft.warehouseAddress?.address?.trim() || "",
          city: draft.warehouseAddress?.city?.trim() || "",
          area: draft.warehouseAddress?.area?.trim() || "",
          postalCode: draft.warehouseAddress?.postalCode?.trim() || "",
          phone: draft.warehouseAddress?.phone?.trim() || "",
        },
        verification: {
          businessType: draft.verification.businessType?.trim() || "",
          registrationNumber: draft.verification.registrationNumber?.trim() || "",
          documentUrl: draft.verification.documentUrl?.trim() || "",
          notes: draft.verification.notes?.trim() || "",
        },
        selectedPlan: "free",
        billingCycle: "monthly",
      })) as { success?: boolean; message?: string } | null;

      if (result?.success === false) {
        toast.error(result.message || "The application could not be submitted.");
        return;
      }

      toast.success(
        isResubmission ? "Application resubmitted" : "Application submitted for review"
      );
      clearDraft();
      router.push("/become-a-vendor/status");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The application could not be submitted.");
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
                onChange={(event) => patchPersonal({ fullName: event.target.value })}
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

            <Field label="Phone" required hint="Buyers and the review team reach you here.">
              <input
                className={INPUT_CLASS}
                value={draft.personalInfo.phone || ""}
                onChange={(event) => patchPersonal({ phone: event.target.value })}
                placeholder="01XXXXXXXXX"
                autoComplete="tel"
              />
            </Field>

            <Field label="Contact note" hint="A second number or the best time to reach you.">
              <input
                className={INPUT_CLASS}
                value={draft.personalInfo.contactInfo || ""}
                onChange={(event) => patchPersonal({ contactInfo: event.target.value })}
                placeholder="Optional"
              />
            </Field>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Store name" required>
                <input
                  className={INPUT_CLASS}
                  value={draft.storeInfo.name}
                  onChange={(event) => patchStore({ name: event.target.value })}
                  placeholder="e.g. Nilkhet Gadgets"
                />
              </Field>

              <Field label="Store link" hint="Buyers open your store at this address.">
                <input
                  className={INPUT_CLASS}
                  value={draft.storeInfo.slug || ""}
                  onChange={(event) => patchStore({ slug: event.target.value })}
                  placeholder={slugPreview(draft.storeInfo.name, "")}
                />
              </Field>
            </div>

            <p className="text-[10px] text-[var(--foreground-muted)]">
              Your store will be reachable at{" "}
              <span className="font-semibold text-[var(--brand-flat)]">
                /store/{linkedStore || "your-store"}
              </span>
            </p>

            <Field label="Short description">
              <textarea
                className={AREA_CLASS}
                value={draft.storeInfo.description || ""}
                onChange={(event) => patchStore({ description: event.target.value })}
                placeholder="What do you sell, and what makes your store worth a visit?"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Main category">
                <input
                  className={INPUT_CLASS}
                  value={draft.storeInfo.category || ""}
                  onChange={(event) => patchStore({ category: event.target.value })}
                  placeholder="Electronics"
                />
              </Field>
              <Field label="Store email">
                <input
                  className={INPUT_CLASS}
                  value={draft.storeInfo.email || ""}
                  onChange={(event) => patchStore({ email: event.target.value })}
                  placeholder="shop@example.com"
                />
              </Field>
              <Field label="Store phone">
                <input
                  className={INPUT_CLASS}
                  value={draft.storeInfo.phone || ""}
                  onChange={(event) => patchStore({ phone: event.target.value })}
                  placeholder="01XXXXXXXXX"
                />
              </Field>
            </div>

            <Field label="Website">
              <input
                className={INPUT_CLASS}
                value={draft.storeInfo.website || ""}
                onChange={(event) => patchStore({ website: event.target.value })}
                placeholder="https://"
              />
            </Field>

            {/* The store's profile image. Upload-or-paste like every other
                image in the app, so a seller with the logo on their laptop can
                attach it instead of hosting it somewhere first. */}
            <ImageUploader
              label="Store logo"
              value={draft.storeInfo.logo || ""}
              onChange={(url) => patchStore({ logo: url })}
              urlPlaceholder="https://"
            />

            <ImageUploader
              label="Cover image"
              hint="The wide banner across the top of your store page."
              value={draft.storeInfo.coverImage || ""}
              onChange={(url) => patchStore({ coverImage: url })}
              urlPlaceholder="https://"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Facebook">
                <input
                  className={INPUT_CLASS}
                  value={draft.storeInfo.socialLinks?.facebook || ""}
                  onChange={(event) =>
                    patchStore({
                      socialLinks: { ...draft.storeInfo.socialLinks, facebook: event.target.value },
                    })
                  }
                  placeholder="https://facebook.com/yourstore"
                />
              </Field>
              <Field label="Instagram">
                <input
                  className={INPUT_CLASS}
                  value={draft.storeInfo.socialLinks?.instagram || ""}
                  onChange={(event) =>
                    patchStore({
                      socialLinks: { ...draft.storeInfo.socialLinks, instagram: event.target.value },
                    })
                  }
                  placeholder="https://instagram.com/yourstore"
                />
              </Field>
              <Field label="X (Twitter)">
                <input
                  className={INPUT_CLASS}
                  value={draft.storeInfo.socialLinks?.x || ""}
                  onChange={(event) =>
                    patchStore({
                      socialLinks: { ...draft.storeInfo.socialLinks, x: event.target.value },
                    })
                  }
                  placeholder="https://x.com/yourstore"
                />
              </Field>
              <Field label="LinkedIn">
                <input
                  className={INPUT_CLASS}
                  value={draft.storeInfo.socialLinks?.linkedin || ""}
                  onChange={(event) =>
                    patchStore({
                      socialLinks: { ...draft.storeInfo.socialLinks, linkedin: event.target.value },
                    })
                  }
                  placeholder="https://linkedin.com/company/yourstore"
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
                  value={draft.businessAddress.country || ""}
                  onChange={(event) => patchAddress({ country: event.target.value })}
                  placeholder="Bangladesh"
                />
              </Field>
              <Field label="Division / state">
                <input
                  className={INPUT_CLASS}
                  value={draft.businessAddress.division || ""}
                  onChange={(event) => patchAddress({ division: event.target.value })}
                  placeholder="Dhaka"
                />
              </Field>
              <Field label="City" required>
                <input
                  className={INPUT_CLASS}
                  value={draft.businessAddress.city || ""}
                  onChange={(event) => patchAddress({ city: event.target.value })}
                  placeholder="Dhaka"
                />
              </Field>
              <Field label="Area">
                <input
                  className={INPUT_CLASS}
                  value={draft.businessAddress.area || ""}
                  onChange={(event) => patchAddress({ area: event.target.value })}
                  placeholder="Dhanmondi"
                />
              </Field>
            </div>

            <Field label="Street address" required>
              <textarea
                className={AREA_CLASS}
                value={draft.businessAddress.address || ""}
                onChange={(event) => patchAddress({ address: event.target.value })}
                placeholder="House, road, landmark"
              />
            </Field>

            <Field label="Postal code">
              <input
                className={INPUT_CLASS}
                value={draft.businessAddress.postalCode || ""}
                onChange={(event) => patchAddress({ postalCode: event.target.value })}
                placeholder="1209"
              />
            </Field>

            <div className="space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                <Warehouse className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
                Warehouse
              </p>
              <p className="text-[10px] text-[var(--foreground-muted)]">
                Optional. Where the stock waits for the rider, when that is not the shop itself.
                Leave the street empty to send riders to the address above.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Warehouse name">
                  <input
                    className={INPUT_CLASS}
                    value={draft.warehouseAddress?.label || ""}
                    onChange={(event) => patchWarehouse({ label: event.target.value })}
                    placeholder="Uttara warehouse"
                  />
                </Field>
                <Field label="Phone at the gate">
                  <input
                    className={INPUT_CLASS}
                    value={draft.warehouseAddress?.phone || ""}
                    onChange={(event) => patchWarehouse({ phone: event.target.value })}
                    placeholder="+880…"
                  />
                </Field>
              </div>

              <Field label="Street">
                <input
                  className={INPUT_CLASS}
                  value={draft.warehouseAddress?.address || ""}
                  onChange={(event) => patchWarehouse({ address: event.target.value })}
                  placeholder="House, road, landmark"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Area">
                  <input
                    className={INPUT_CLASS}
                    value={draft.warehouseAddress?.area || ""}
                    onChange={(event) => patchWarehouse({ area: event.target.value })}
                    placeholder="Uttara"
                  />
                </Field>
                <Field label="City">
                  <input
                    className={INPUT_CLASS}
                    value={draft.warehouseAddress?.city || ""}
                    onChange={(event) => patchWarehouse({ city: event.target.value })}
                    placeholder="Dhaka"
                  />
                </Field>
                <Field label="Postal code">
                  <input
                    className={INPUT_CLASS}
                    value={draft.warehouseAddress?.postalCode || ""}
                    onChange={(event) => patchWarehouse({ postalCode: event.target.value })}
                    placeholder="1230"
                  />
                </Field>
              </div>
            </div>

            <p className="flex items-start gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] p-3 text-[10px] text-[var(--foreground-muted)]">
              <MapPinned className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--brand-flat)]" />
              The business address is where the shop operates. Buyers see it as the store
              location; the warehouse stays between you, the store team and the rider.
            </p>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <p className="rounded-xl border border-sky-200/70 dark:border-sky-900/50 bg-sky-500/10 p-3 text-[10px] text-sky-800 dark:text-sky-200">
              Everything on this step is optional. A home seller has no trade licence, and the
              marketplace must not turn one away for that — a document only speeds the review up.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business type">
                <AppSelect
                  ariaLabel="Business type"
                  value={draft.verification.businessType || ""}
                  onChange={(v) => patchVerification({ businessType: v })}
                  options={VENDOR_BUSINESS_TYPES.map((type) => ({
                    value: type,
                    label: type,
                  }))}
                  placeholder="Not registered"
                />
              </Field>

              <Field label="Registration number">
                <input
                  className={INPUT_CLASS}
                  value={draft.verification.registrationNumber || ""}
                  onChange={(event) => patchVerification({ registrationNumber: event.target.value })}
                  placeholder="Trade licence, TIN or company number"
                />
              </Field>
            </div>

            {/* Uploaded, not pasted: a licence is a photo on the applicant's
                phone, and asking them to host it somewhere first is how an
                optional step turns into an abandoned application. */}
            <ImageUploader
              label="Verification document"
              compact
              accept="document"
              hint="A scanned trade licence, TIN or company certificate — a photo or a PDF. The store team reads it during review."
              value={draft.verification.documentUrl || ""}
              onChange={(url) => patchVerification({ documentUrl: url })}
            />

            <Field label="Notes for the reviewer">
              <textarea
                className={AREA_CLASS}
                value={draft.verification.notes || ""}
                onChange={(event) => patchVerification({ notes: event.target.value })}
                placeholder="Anything the store team should know about your business."
              />
            </Field>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <SummaryBlock
              title="Personal"
              rows={[
                { label: "Name", value: draft.personalInfo.fullName },
                { label: "Email", value: draft.personalInfo.email },
                { label: "Phone", value: draft.personalInfo.phone },
                { label: "Contact note", value: draft.personalInfo.contactInfo },
              ]}
            />

            <SummaryBlock
              title="Store"
              rows={[
                { label: "Name", value: draft.storeInfo.name },
                { label: "Link", value: linkedStore ? `/store/${linkedStore}` : "" },
                { label: "Category", value: draft.storeInfo.category },
                { label: "Store email", value: draft.storeInfo.email },
                { label: "Store phone", value: draft.storeInfo.phone },
                { label: "Website", value: draft.storeInfo.website },
                { label: "Description", value: draft.storeInfo.description },
              ]}
            />

            <SummaryBlock
              title="Business address"
              rows={[
                { label: "Country", value: draft.businessAddress.country },
                { label: "Division", value: draft.businessAddress.division },
                { label: "City", value: draft.businessAddress.city },
                { label: "Area", value: draft.businessAddress.area },
                { label: "Address", value: draft.businessAddress.address },
                { label: "Postal code", value: draft.businessAddress.postalCode },
              ]}
            />

            <SummaryBlock
              title="Warehouse"
              rows={[
                { label: "Name", value: draft.warehouseAddress?.label },
                { label: "Address", value: draft.warehouseAddress?.address },
                { label: "Area", value: draft.warehouseAddress?.area },
                { label: "City", value: draft.warehouseAddress?.city },
                { label: "Postal code", value: draft.warehouseAddress?.postalCode },
                { label: "Phone", value: draft.warehouseAddress?.phone },
              ]}
            />

            <SummaryBlock
              title="Verification"
              rows={[
                { label: "Business type", value: draft.verification.businessType },
                { label: "Registration", value: draft.verification.registrationNumber },
                {
                  label: "Document",
                  value: draft.verification.documentUrl?.trim() ? "Uploaded" : "",
                },
                { label: "Notes", value: draft.verification.notes },
              ]}
            />

            <p className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] p-3 text-[10px] text-[var(--foreground-muted)]">
              Submitting keeps your account exactly as it is — same login, same orders, same
              wishlist and wallet. While the application is pending you cannot sign in; you are
              emailed at every decision.
            </p>
          </div>
        );
    }
  };

  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Step rail */}
      <aside className="space-y-3">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            {isResubmission ? "Applying again" : "Application"}
          </p>
          <p className="mt-1 text-sm font-bold text-[var(--foreground)]">
            {storeName || draft.storeInfo.name || "Your store"}
          </p>
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
              href="/become-a-vendor"
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

/**
 * The same checks as `stepError`, but for any step.
 *
 * It is used once on submit so a field emptied by going back cannot slip past
 * the form and fail as an API validation error the applicant cannot place.
 */
function stepErrorFor(
  step: number,
  draft: VendorApplicationDraft,
  linkedStore: string
): string | null {
  if (step === 0) {
    if (draft.personalInfo.fullName.trim().length < 2) return "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(draft.personalInfo.email.trim()))
      return "Enter a valid email address.";
    // A store has to be reachable: the review team and buyers both need a
    // working number, even when the account itself was created without one.
    if ((draft.personalInfo.phone || "").trim().length < 6)
      return "Enter a phone number so the team can reach you.";
  }
  if (step === 1) {
    if (draft.storeInfo.name.trim().length < 2) return "Enter your store name.";
    if (linkedStore.length < 2) return "Enter a store link using letters or numbers.";
  }
  if (step === 2) {
    if (!draft.businessAddress.country?.trim()) return "Select the country.";
    if (!draft.businessAddress.city?.trim()) return "Enter the city.";
    if (!draft.businessAddress.address?.trim()) return "Enter the street address.";
  }
  return null;
}
