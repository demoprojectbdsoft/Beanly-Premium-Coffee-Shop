import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bike,
  Clock3,
  FileCheck2,
  HandCoins,
  MapPinned,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { getUserSession } from "@/lib/core/session";
import { hasRole } from "@/lib/core/roles";
import { asRiderApplication, getMyRiderApplication } from "@/lib/api/rider";
import { getRiderStatusLabel } from "@/lib/riderStatus";

export const dynamic = "force-dynamic";

/**
 * The rider pitch, and the front door of the conversion flow.
 *
 * It is public: a visitor reads how it works before creating anything. A
 * signed-in customer sees "Apply" — which opens the multi-step form already
 * filled from their account — while an applicant whose review is open sees the
 * state of that review instead of being invited to apply twice.
 */

const HOW_IT_WORKS = [
  {
    icon: FileCheck2,
    title: "Apply in six steps",
    text: "Your name and email arrive already filled from your account. You add how to reach you, where you deliver, your vehicle and your documents.",
  },
  {
    icon: Clock3,
    title: "The delivery team reviews",
    text: "Most applications are read within two working days. You are notified at every decision, and a rejection always comes with its reason.",
  },
  {
    icon: ShieldCheck,
    title: "Approval turns on the rider dashboard",
    text: "Approval grants the rider role on the very same account. Your orders, wishlist, wallet and addresses all stay exactly where they were.",
  },
  {
    icon: Bike,
    title: "Start delivering",
    text: "Open the rider dashboard to receive nearby delivery requests, track your earnings and set the days and hours you work.",
  },
];

const PERKS = [
  { icon: Wallet, title: "Flexible pay", text: "Deliver when you want and track every payout from the rider wallet." },
  { icon: MapPinned, title: "Nearby orders", text: "We match you with pickups close to your service area." },
  { icon: HandCoins, title: "Keep your account", text: "No second sign-up — becoming a rider only adds a role you can switch to." },
];

export default async function BecomeARiderPage() {
  const user = await getUserSession();

  const application = user ? asRiderApplication(await getMyRiderApplication()) : null;

  // What the primary call-to-action should be, decided on the server so the
  // page never invites a duplicate application or an approved rider back in.
  let ctaHref = "/become-a-rider/apply";
  let ctaLabel = "Apply to become a rider";
  if (user && hasRole(user, "rider")) {
    ctaHref = "/dashboard/rider";
    ctaLabel = "Open the rider dashboard";
  } else if (
    application &&
    application.status !== "rejected" &&
    application.status !== "cancelled"
  ) {
    ctaHref = "/become-a-rider/status";
    ctaLabel = `Application ${getRiderStatusLabel(application.status).toLowerCase()}`;
  } else if (!user) {
    const next = encodeURIComponent("/become-a-rider/apply");
    ctaHref = `/auth/login?callbackUrl=${next}`;
    ctaLabel = "Sign in to apply";
  }

  const firstName = user?.name ? user.name.split(" ")[0] : null;

  return (
    <div className="py-8 space-y-10">
      {/* Hero */}
      <section className="space-y-4 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-flat)]/12 text-[var(--brand-flat)]">
          <Bike className="w-7 h-7" />
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Deliver with {firstName ? "" : "Sparq"}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-[var(--foreground-muted)]">
          Turn your spare hours into earnings. Apply as a Sparq delivery rider on the account you
          already have — no second sign-up, and you keep shopping whenever you are not on a run.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-bold text-[var(--on-grad-text)] shadow-xs transition-all hover:shadow-md"
          >
            {ctaLabel}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/become-a-rider/status"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
          >
            Check my application
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-5">
        <h2 className="text-center text-lg font-bold text-[var(--foreground)]">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-flat)]/12 text-[var(--brand-flat)]">
                  <Icon className="w-5 h-5" />
                </span>
                <h3 className="mt-3 text-sm font-bold text-[var(--foreground)]">{item.title}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Perks */}
      <section className="space-y-5">
        <h2 className="text-center text-lg font-bold text-[var(--foreground)]">
          Why riders choose Sparq
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PERKS.map((perk) => {
            const Icon = perk.icon;
            return (
              <div
                key={perk.title}
                className="flex items-start gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-flat)]/12 text-[var(--brand-flat)]">
                  <Icon className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-[13px] font-bold text-[var(--foreground)]">{perk.title}</h3>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                    {perk.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer note */}
      <p className="mx-auto max-w-2xl text-center text-[11px] text-[var(--foreground-muted)]">
        Every application is reviewed by a person. We never approve automatically, and a rejection
        always comes with the reason so you can fix it and apply again.
      </p>
    </div>
  );
}
