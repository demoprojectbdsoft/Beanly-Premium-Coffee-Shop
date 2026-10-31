import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getUserSession } from "@/lib/core/session";
import { isVendorRole } from "@/lib/core/roles";
import { asApplication, asPlans, getMyVendorApplication, getVendorPlans } from "@/lib/api/vendor";
import { getSiteSettings } from "@/lib/api/siteSettings";
import type {
  BillingCycle,
  VendorApplication,
  VendorApplicationDraft,
  VendorPlanId,
} from "@/types/vendor";
import VendorApplicationWizard from "@/components/vendor/VendorApplicationWizard";

export const dynamic = "force-dynamic";

/**
 * The six-step form, opened by an account that already exists.
 *
 * Everything about the person arrives filled from that account, which is the
 * whole point of the conversion flow: the applicant is not asked to retype what
 * the store already knows, and submitting links the application to the same
 * user id instead of creating a second one.
 *
 * Two doors are closed here rather than in the form: a vendor has nothing to
 * apply for, and an applicant with an open or approved application is sent to
 * their status page instead of being allowed to submit a duplicate.
 */

const PLAN_IDS: VendorPlanId[] = ["free", "premium", "advanced"];

/** The draft a first-time applicant starts from. */
function emptyDraft(name: string, email: string, phone: string, plan: VendorPlanId): VendorApplicationDraft {
  return {
    personalInfo: { fullName: name, email, phone, contactInfo: "" },
    storeInfo: {
      name: "",
      slug: "",
      description: "",
      logo: "",
      coverImage: "",
      email: "",
      phone: "",
      category: "",
      website: "",
      socialLinks: { facebook: "", instagram: "", x: "", linkedin: "" },
    },
    businessAddress: {
      country: "Bangladesh",
      division: "",
      city: "",
      area: "",
      address: "",
      postalCode: "",
      latitude: null,
      longitude: null,
    },
    verification: { businessType: "", registrationNumber: "", documentUrl: "", notes: "" },
    selectedPlan: plan,
    billingCycle: "monthly" as BillingCycle,
  };
}

/**
 * A returning applicant gets their earlier answers back.
 *
 * Resubmitting on the same row is deliberate — the reference stays stable and
 * the store team keeps the earlier review in the same file — but retyping a
 * whole store description to fix one rejected document would be cruel.
 */
function draftFromApplication(
  application: VendorApplication,
  fallbackName: string,
  fallbackEmail: string,
  fallbackPhone: string
): VendorApplicationDraft {
  const base = emptyDraft(fallbackName, fallbackEmail, fallbackPhone, application.selectedPlan);
  return {
    personalInfo: {
      ...base.personalInfo,
      ...application.personalInfo,
      fullName: application.personalInfo?.fullName || fallbackName,
      email: fallbackEmail || application.personalInfo?.email || "",
    },
    storeInfo: { ...base.storeInfo, ...application.storeInfo },
    businessAddress: { ...base.businessAddress, ...application.businessAddress },
    verification: { ...base.verification, ...application.verification },
    selectedPlan: application.selectedPlan,
    billingCycle: application.billingCycle,
  };
}

interface ApplyPageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function VendorApplyPage({ searchParams }: ApplyPageProps) {
  const user = await getUserSession();
  if (!user) {
    redirect("/auth/login?callbackUrl=%2Fbecome-a-vendor%2Fapply");
  }
  if (isVendorRole(user)) {
    redirect("/dashboard/vendor");
  }

  const [application, plans, settingsRes] = await Promise.all([
    getMyVendorApplication().then(asApplication),
    getVendorPlans().then(asPlans),
    getSiteSettings(),
  ]);

  // An open or approved application cannot be submitted twice; the status page
  // is the only useful place to be.
  if (application && application.status !== "rejected" && application.status !== "cancelled") {
    redirect("/become-a-vendor/status");
  }

  const params = await searchParams;
  const requestedPlan = PLAN_IDS.includes((params?.plan || "") as VendorPlanId)
    ? ((params?.plan || "free") as VendorPlanId)
    : application?.selectedPlan || "free";

  const accountUser = user as typeof user & { phone?: string | null };
  const draft = application
    ? draftFromApplication(
        application,
        user.name || "",
        user.email || "",
        accountUser.phone || ""
      )
    : emptyDraft(user.name || "", user.email || "", accountUser.phone || "", requestedPlan);

  // A plan clicked on the landing page wins over the earlier, withdrawn choice.
  const initialDraft: VendorApplicationDraft = {
    ...draft,
    selectedPlan: params?.plan ? requestedPlan : draft.selectedPlan,
  };

  return (
    <div className="py-8 space-y-6">
      <header className="space-y-2">
        <Link
          href="/become-a-vendor"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to the marketplace page
        </Link>

        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {application ? "Apply again" : "Vendor application"}
        </h1>
        <p className="max-w-2xl text-xs text-[var(--foreground-muted)]">
          {application
            ? "Your earlier answers are already here. Change what the store team asked for and resubmit — the reference stays the same."
            : "Six short steps. The personal step is filled from your account, and submitting never creates a second user."}
        </p>
      </header>

      <VendorApplicationWizard
        plans={plans}
        currency={settingsRes?.data?.currency}
        initialDraft={initialDraft}
        storeName={application?.storeInfo?.name}
        isResubmission={Boolean(application)}
      />
    </div>
  );
}
