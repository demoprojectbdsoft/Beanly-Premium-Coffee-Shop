"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  MapPin,
  Save,
  Share2,
  ShieldCheck,
  Store,
  User,
} from "lucide-react";
import { toast } from "react-toastify";
import ImageUploader from "@/components/shared/ImageUploader";
import AppSelect from "@/components/shared/AppSelect";
import { updateMyStore, updateMyVendorProfile } from "@/lib/action/vendor";
import { VENDOR_BUSINESS_TYPES } from "@/types/vendor";
import type { VendorApplication, VendorStore } from "@/types/vendor";

/**
 * The seller's profile.
 *
 * One form holds the whole application file: the person who applied, the
 * storefront buyers see, the business address and the verification upload. A
 * save writes the file and the API mirrors it onto the store row, so the review
 * desk, the storefront and the account can never disagree about one shop.
 *
 * Two things stay out of reach. The slug is shown but never edited, because
 * every published link to the shop is built from it. The plan is not a form
 * field either — changing one is a paid action and belongs on the subscription
 * desk.
 */

interface StoreProfileClientProps {
  store: VendorStore;
  /** The application the wizard wrote; absent only on a hand-opened record. */
  application?: VendorApplication | null;
}

type Draft = {
  name: string;
  description: string;
  logo: string;
  coverImage: string;
  email: string;
  phone: string;
  category: string;
  website: string;
  isVisible: boolean;
  country: string;
  division: string;
  city: string;
  area: string;
  street: string;
  postalCode: string;
  facebook: string;
  instagram: string;
  x: string;
  linkedin: string;
  ownerName: string;
  ownerPhone: string;
  contactNote: string;
  businessType: string;
  registrationNumber: string;
  documentUrl: string;
  verificationNotes: string;
};

function toDraft(store: VendorStore, application?: VendorApplication | null): Draft {
  const file = application?.storeInfo;
  const address = store.address ?? application?.businessAddress;
  const links = store.socialLinks ?? file?.socialLinks;
  return {
    name: store.name || file?.name || "",
    description: store.description ?? file?.description ?? "",
    logo: store.logo || file?.logo || "",
    coverImage: store.coverImage || file?.coverImage || "",
    email: store.email ?? file?.email ?? "",
    phone: store.phone ?? file?.phone ?? "",
    category: store.category || file?.category || "",
    website: store.website || file?.website || "",
    isVisible: store.isVisible !== false,
    country: address?.country || "",
    division: address?.division || "",
    city: address?.city || "",
    area: address?.area || "",
    street: address?.address || "",
    postalCode: address?.postalCode || "",
    facebook: links?.facebook || "",
    instagram: links?.instagram || "",
    x: links?.x || "",
    linkedin: links?.linkedin || "",
    // The seller's own lines exist only in the file — the store row keeps the
    // shop's contact details, not the person's.
    ownerName: application?.personalInfo?.fullName || "",
    ownerPhone: application?.personalInfo?.phone || "",
    contactNote: application?.personalInfo?.contactInfo || "",
    businessType: application?.verification?.businessType || "",
    registrationNumber: application?.verification?.registrationNumber || "",
    documentUrl: application?.verification?.documentUrl || "",
    verificationNotes: application?.verification?.notes || "",
  };
}

const inputClass =
  "h-9 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 text-[11px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35";

const labelClass = "mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export default function StoreProfileClient({
  store,
  application = null,
}: StoreProfileClientProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(store, application));
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const suspended = store.status === "suspended";
  const closed = store.status === "closed";

  const save = async () => {
    if (saving) return;

    if (draft.name.trim().length < 2) {
      toast.warning("Give the store a name of at least two characters.");
      return;
    }

    setSaving(true);
    try {
      const storefront = {
        name: draft.name.trim(),
        description: draft.description.trim(),
        logo: draft.logo.trim(),
        coverImage: draft.coverImage.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        category: draft.category.trim(),
        website: draft.website.trim(),
      };
      const address = {
        country: draft.country.trim(),
        division: draft.division.trim(),
        city: draft.city.trim(),
        area: draft.area.trim(),
        address: draft.street.trim(),
        postalCode: draft.postalCode.trim(),
      };
      const socialLinks = {
        facebook: draft.facebook.trim(),
        instagram: draft.instagram.trim(),
        x: draft.x.trim(),
        linkedin: draft.linkedin.trim(),
      };

      // With a file on record, one call writes it and the API mirrors the
      // storefront, the address and the visibility onto the store row. Without
      // one — a shop the store team opened by hand — only the storefront can be
      // saved, because there is no application to correct.
      const res = application
        ? ((await updateMyVendorProfile({
            personalInfo: {
              fullName: draft.ownerName.trim(),
              phone: draft.ownerPhone.trim(),
              contactInfo: draft.contactNote.trim(),
            },
            storeInfo: { ...storefront, socialLinks },
            businessAddress: address,
            verification: {
              businessType: draft.businessType.trim(),
              registrationNumber: draft.registrationNumber.trim(),
              documentUrl: draft.documentUrl.trim(),
              notes: draft.verificationNotes.trim(),
            },
            isVisible: draft.isVisible,
          })) as { success?: boolean; message?: string } | null)
        : await updateMyStore({
            ...storefront,
            isVisible: draft.isVisible,
            address,
            socialLinks,
          });

      if (res?.success === false) {
        toast.error(res.message || "The store could not be saved");
        return;
      }

      toast.success("Profile saved");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Store profile</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            The details buyers and the store team see at{" "}
            <span className="font-mono">/vendors/{store.slug || "your-store"}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving || closed}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-[11px] font-bold text-[var(--on-grad-text)] shadow-xs disabled:opacity-60 cursor-pointer"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? "Saving" : "Save changes"}
        </button>
      </header>

      {suspended && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          This store is suspended, so it stays hidden from buyers.
          {store.suspendedReason ? ` Reason: ${store.suspendedReason}` : ""}
        </div>
      )}

      {closed && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          This store is closed. Contact the store team to reopen it.
        </div>
      )}

      {/* Live preview */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        <div className="relative h-28 bg-[var(--surface-alt)]">
          {draft.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.coverImage} alt="Store cover" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
              Cover image
            </div>
          )}
        </div>

        <div className="relative px-4 pb-4">
          <div className="-mt-6 flex items-end gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-[var(--surface-elevated)] bg-[var(--surface-alt)] text-[var(--brand-flat)] shadow-xs">
              {draft.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.logo} alt={draft.name} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-6 w-6" />
              )}
            </div>

            <div className="min-w-0 pb-1">
              <p className="truncate text-sm font-bold text-[var(--foreground)]">
                {draft.name || "Your store"}
              </p>
              <p className="flex items-center gap-1 text-[10px] text-[var(--foreground-muted)]">
                <BadgeCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                {draft.category || "Uncategorised"}
              </p>
            </div>

            <span
              className={`mb-1 ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${
                draft.isVisible && !suspended && !closed
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30"
                  : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-500/15 dark:text-slate-200 dark:border-slate-500/30"
              }`}
            >
              {draft.isVisible && !suspended && !closed ? (
                <Eye className="h-2.5 w-2.5" />
              ) : (
                <EyeOff className="h-2.5 w-2.5" />
              )}
              {draft.isVisible && !suspended && !closed ? "Visible" : "Hidden"}
            </span>
          </div>

          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
            {draft.description || "Add a description so buyers know what you sell."}
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
          <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            <Store className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
            Storefront
          </h2>

          <Field label="Store name">
            <input
              value={draft.name}
              onChange={(event) => set("name", event.target.value)}
              maxLength={120}
              className={inputClass}
            />
          </Field>

          <Field label="Category">
            <input
              value={draft.category}
              onChange={(event) => set("category", event.target.value)}
              placeholder="Electronics, fashion, groceries…"
              maxLength={80}
              className={inputClass}
            />
          </Field>

          <Field label="Description">
            <textarea
              value={draft.description}
              onChange={(event) => set("description", event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="What does the shop sell, and what makes it different?"
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-[11px] leading-relaxed text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35"
            />
          </Field>

          <ImageUploader label="Store logo" value={draft.logo} onChange={(url) => set("logo", url)} />
          <ImageUploader
            label="Cover image"
            value={draft.coverImage}
            onChange={(url) => set("coverImage", url)}
            urlPlaceholder="https://example.com/store-cover.webp"
          />
        </section>

        <div className="space-y-4">
          <section className="space-y-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
            <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              <User className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
              Seller account
            </h2>

            {!application && (
              <p className="flex items-start gap-1.5 rounded-xl bg-[var(--surface-alt)] px-3 py-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
                <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
                Your shop was opened by the store team, so no application file sits behind it and
                these lines cannot be edited here.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Your name">
                <input
                  value={draft.ownerName}
                  onChange={(event) => set("ownerName", event.target.value)}
                  maxLength={120}
                  disabled={!application}
                  className={`${inputClass} disabled:opacity-60`}
                />
              </Field>
              <Field label="Your phone">
                <input
                  value={draft.ownerPhone}
                  onChange={(event) => set("ownerPhone", event.target.value)}
                  maxLength={30}
                  placeholder="01XXXXXXXXX"
                  disabled={!application}
                  className={`${inputClass} disabled:opacity-60`}
                />
              </Field>
            </div>

            <Field label="Login email">
              <input
                value={application?.personalInfo?.email || store.email || ""}
                readOnly
                tabIndex={-1}
                className={`${inputClass} cursor-not-allowed opacity-70`}
              />
            </Field>

            <Field label="Contact note">
              <input
                value={draft.contactNote}
                onChange={(event) => set("contactNote", event.target.value)}
                placeholder="A second number or the best time to reach you"
                maxLength={200}
                disabled={!application}
                className={`${inputClass} disabled:opacity-60`}
              />
            </Field>
          </section>

          <section className="space-y-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
            <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              <Globe className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
              Contact
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Store email">
                <input
                  value={draft.email}
                  onChange={(event) => set("email", event.target.value)}
                  type="email"
                  maxLength={200}
                  className={inputClass}
                />
              </Field>
              <Field label="Store phone">
                <input
                  value={draft.phone}
                  onChange={(event) => set("phone", event.target.value)}
                  maxLength={30}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Website">
              <input
                value={draft.website}
                onChange={(event) => set("website", event.target.value)}
                placeholder="https://"
                maxLength={300}
                className={inputClass}
              />
            </Field>
          </section>

          <section className="space-y-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
            <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              <MapPin className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
              Business address
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Country">
                <input
                  value={draft.country}
                  onChange={(event) => set("country", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Division">
                <input
                  value={draft.division}
                  onChange={(event) => set("division", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="City">
                <input
                  value={draft.city}
                  onChange={(event) => set("city", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Area">
                <input
                  value={draft.area}
                  onChange={(event) => set("area", event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Street">
              <input
                value={draft.street}
                onChange={(event) => set("street", event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Postal code">
              <input
                value={draft.postalCode}
                onChange={(event) => set("postalCode", event.target.value)}
                className={inputClass}
              />
            </Field>
          </section>

          <section className="space-y-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
            <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              <Share2 className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
              Social links
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Facebook">
                <input
                  value={draft.facebook}
                  onChange={(event) => set("facebook", event.target.value)}
                  placeholder="https://facebook.com/…"
                  className={inputClass}
                />
              </Field>
              <Field label="Instagram">
                <input
                  value={draft.instagram}
                  onChange={(event) => set("instagram", event.target.value)}
                  placeholder="https://instagram.com/…"
                  className={inputClass}
                />
              </Field>
              <Field label="X">
                <input
                  value={draft.x}
                  onChange={(event) => set("x", event.target.value)}
                  placeholder="https://x.com/…"
                  className={inputClass}
                />
              </Field>
              <Field label="LinkedIn">
                <input
                  value={draft.linkedin}
                  onChange={(event) => set("linkedin", event.target.value)}
                  placeholder="https://linkedin.com/…"
                  className={inputClass}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
            <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
              Verification
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Business type">
                <AppSelect
                  ariaLabel="Business type"
                  value={draft.businessType}
                  onChange={(value) => set("businessType", value)}
                  options={VENDOR_BUSINESS_TYPES.map((type) => ({
                    value: type,
                    label: type,
                  }))}
                  placeholder="Not registered"
                  isDisabled={!application}
                  size="sm"
                />
              </Field>
              <Field label="Registration number">
                <input
                  value={draft.registrationNumber}
                  onChange={(event) => set("registrationNumber", event.target.value)}
                  placeholder="Trade licence, TIN or company number"
                  maxLength={120}
                  disabled={!application}
                  className={`${inputClass} disabled:opacity-60`}
                />
              </Field>
            </div>

            {application && (
              <ImageUploader
                label="Verification document"
                value={draft.documentUrl}
                onChange={(url) => set("documentUrl", url)}
                urlPlaceholder="https://"
              />
            )}

            <Field label="Notes for the reviewer">
              <textarea
                value={draft.verificationNotes}
                onChange={(event) => set("verificationNotes", event.target.value)}
                rows={3}
                maxLength={2000}
                disabled={!application}
                placeholder="Anything the store team should know about the papers"
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-[11px] leading-relaxed text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35 disabled:opacity-60"
              />
            </Field>

            <p className="text-[10px] leading-relaxed text-[var(--foreground-muted)]">
              The shop stays open while you update these. A change to the business type or the
              document may be checked again by the store team.
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[11px] font-bold text-[var(--foreground)]">Store visibility</h2>
                <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
                  A hidden store keeps its link working but leaves the marketplace listings.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={draft.isVisible}
                onClick={() => set("isVisible", !draft.isVisible)}
                disabled={suspended || closed}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 cursor-pointer ${
                  draft.isVisible ? "bg-emerald-500" : "bg-[var(--border-color)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                    draft.isVisible ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving || closed}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-4 py-2.5 text-[11px] font-bold text-[var(--on-grad-text)] shadow-xs disabled:opacity-60 cursor-pointer"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? "Saving" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
