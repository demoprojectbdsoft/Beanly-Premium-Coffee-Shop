import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getUserSession } from "@/lib/core/session";
import { hasRole } from "@/lib/core/roles";
import { asRiderApplication, getMyRiderApplication } from "@/lib/api/rider";
import type { RiderApplication, RiderApplicationDraft } from "@/types/rider";
import RiderApplicationWizard from "@/components/rider/RiderApplicationWizard";

export const dynamic = "force-dynamic";

/**
 * The six-step rider form, opened by an account that already exists.
 *
 * Everything about the person arrives filled from that account, which is the
 * whole point of the conversion flow: the applicant is not asked to retype what
 * the store already knows, and submitting links the application to the same
 * user id instead of creating a second one.
 *
 * Two doors are closed here rather than in the form: an approved rider has
 * nothing to apply for, and an applicant with an open application is sent to
 * their status page instead of being allowed to submit a duplicate.
 */

/** The draft a first-time applicant starts from. */
function emptyDraft(
  name: string,
  email: string,
  phone: string
): RiderApplicationDraft {
  return {
    personalInfo: {
      fullName: name,
      email,
      phone,
      dateOfBirth: null,
      nationalId: "",
      photoUrl: "",
    },
    contactInfo: {
      emergencyContactName: "",
      emergencyContactPhone: "",
      preferredContact: "phone",
    },
    serviceAddress: {
      country: "Bangladesh",
      division: "",
      city: "",
      area: "",
      address: "",
      postalCode: "",
      latitude: null,
      longitude: null,
    },
    vehicle: {
      type: "motorcycle",
      number: "",
      licenseNumber: "",
      licenseExpiry: null,
      hasOwnVehicle: true,
    },
    documents: {
      drivingLicenseUrl: "",
      nationalIdUrl: "",
      vehicleDocsUrl: "",
      otherUrl: "",
      notes: "",
    },
    availability: { days: [], slots: [], maxDistanceKm: 15, note: "" },
    experience: { years: 0, previousPlatforms: "", note: "" },
    confirm: false,
  };
}

/**
 * A returning applicant gets their earlier answers back.
 *
 * Resubmitting on the same row is deliberate — the reference stays stable and
 * the delivery team keeps the earlier review in the same file — but retyping a
 * whole vehicle and document set to fix one rejected photo would be cruel.
 */
function draftFromApplication(
  application: RiderApplication,
  fallbackName: string,
  fallbackEmail: string,
  fallbackPhone: string
): RiderApplicationDraft {
  const base = emptyDraft(fallbackName, fallbackEmail, fallbackPhone);
  return {
    personalInfo: {
      ...base.personalInfo,
      ...application.personalInfo,
      fullName: application.personalInfo?.fullName || fallbackName,
      email: fallbackEmail || application.personalInfo?.email || "",
    },
    contactInfo: { ...base.contactInfo, ...(application.contactInfo || {}) },
    serviceAddress: { ...base.serviceAddress, ...application.serviceAddress },
    vehicle: { ...base.vehicle, ...application.vehicle },
    documents: { ...base.documents, ...(application.documents || {}) },
    availability: { ...base.availability, ...(application.availability || {}) },
    experience: { ...base.experience, ...(application.experience || {}) },
    confirm: false,
  };
}

export default async function RiderApplyPage() {
  const user = await getUserSession();
  if (!user) {
    redirect("/auth/login?callbackUrl=%2Fbecome-a-rider%2Fapply");
  }
  if (hasRole(user, "rider")) {
    redirect("/dashboard/rider");
  }

  const application = asRiderApplication(await getMyRiderApplication());

  // An open or approved application cannot be submitted twice; the status page
  // is the only useful place to be.
  if (application && application.status !== "rejected" && application.status !== "cancelled") {
    redirect("/become-a-rider/status");
  }

  const accountUser = user as typeof user & { phone?: string | null };
  const draft = application
    ? draftFromApplication(
        application,
        user.name || "",
        user.email || "",
        accountUser.phone || ""
      )
    : emptyDraft(user.name || "", user.email || "", accountUser.phone || "");

  return (
    <div className="py-8 space-y-6">
      <header className="space-y-2">
        <Link
          href="/become-a-rider"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to the rider page
        </Link>

        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {application ? "Apply again" : "Rider application"}
        </h1>
        <p className="max-w-2xl text-xs text-[var(--foreground-muted)]">
          {application
            ? "Your earlier answers are already here. Change what the delivery team asked for and resubmit — the reference stays the same."
            : "Six short steps. The personal step is filled from your account, and submitting never creates a second user."}
        </p>
      </header>

      <RiderApplicationWizard
        initialDraft={draft}
        isResubmission={Boolean(application)}
        restoreLocal={!application}
      />
    </div>
  );
}
