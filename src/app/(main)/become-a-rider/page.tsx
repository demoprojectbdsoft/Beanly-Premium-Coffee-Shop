import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  CalendarDays,
  CircleUser,
  Clock3,
  FileCheck2,
  HandCoins,
  ListChecks,
  MapPin,
  MapPinned,
  Navigation,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import { getUserSession } from "@/lib/core/session";
import { hasRole } from "@/lib/core/roles";
import { asRiderApplication, getMyRiderApplication } from "@/lib/api/rider";
import { getRiderStatusLabel } from "@/lib/riderStatus";
import FaqAccordion, { type FaqItem } from "@/components/shared/FaqAccordion";

export const dynamic = "force-dynamic";

/**
 * The rider pitch, and the front door of the conversion flow.
 *
 * It is public: a visitor reads how it works before creating anything. A
 * signed-in customer sees "Apply" — which opens the multi-step form already
 * filled from their account — while an applicant whose review is open sees the
 * state of that review instead of being invited to apply twice.
 *
 * The page is built as a pitch rather than a form intro: what the job looks
 * like, what the review takes, what has to be in the applicant's hand when they
 * apply, and the questions that stop an application being started at all.
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
  {
    icon: Wallet,
    title: "Paid on every hand-over",
    text: "A delivered job books its fee to your earnings the moment the customer's code closes it — no waiting on a separate payout run.",
  },
  {
    icon: MapPinned,
    title: "Nearby orders",
    text: "You set the distance you will ride and the area you serve, and the board matches you with pickups inside them.",
  },
  {
    icon: HandCoins,
    title: "Keep your account",
    text: "No second sign-up. Becoming a rider only adds a role you can switch in and out of, and your shopping history stays put.",
  },
];

/**
 * What the applicant has to have to hand before step five of the form.
 *
 * Listed here rather than discovered in the wizard: the two documents a motor
 * vehicle needs are the ones that send an application back for a clearer photo,
 * so they are named up front.
 */
const REQUIREMENTS = [
  {
    icon: Smartphone,
    title: "A phone that can share a location",
    text: "The customer's map follows your position while you carry their parcel, so the browser needs location permission.",
  },
  {
    icon: Bike,
    title: "Something to deliver with",
    text: "A motorcycle, scooter, car, bicycle — or your own two feet for short drops.",
  },
  {
    icon: FileCheck2,
    title: "Driving licence and vehicle papers",
    text: "Required for a motorcycle, scooter or car, uploaded as photos. Not asked of a bicycle or a rider on foot.",
  },
  {
    icon: BadgeCheck,
    title: "A national ID or passport",
    text: "The number goes in the personal step; the photo is uploaded with the rest of the documents.",
  },
  {
    icon: MapPin,
    title: "The area you can serve",
    text: "City, area and the furthest distance you will ride for one delivery.",
  },
];

/** The four numbers the pitch hangs on — the review, the form, the schedule, the account. */
const AT_A_GLANCE = [
  { icon: Clock3, value: "2 days", label: "Typical review time" },
  { icon: ListChecks, value: "6 steps", label: "One application form" },
  { icon: CalendarDays, value: "7 days", label: "You pick the days and slots" },
  { icon: CircleUser, value: "1 account", label: "No second sign-up" },
];

const FAQS = [
  {
    icon: "user",
    question: "Do I need a second account?",
    answer:
      "No. The application is linked to the account you already have. Approval adds the rider role beside your customer role — nothing is copied and nothing is reset.",
  },
  {
    icon: "clock",
    question: "How long does the review take?",
    answer:
      "Most applications are read within two working days. Every decision is sent to you, and a rejection always arrives with the reason it was given.",
  },
  {
    icon: "file",
    question: "Which documents do I have to upload?",
    answer:
      "A driving licence and the vehicle registration papers for a motorcycle, scooter or car, plus a national ID or passport. On a bicycle or on foot, the licence and the papers are not asked for.",
  },
  {
    icon: "navigation",
    question: "Do I have to ride across the whole city?",
    answer:
      "No. You set the maximum distance per delivery and the area you serve, and requests are matched to them. You can change both from the rider profile at any time.",
  },
  {
    icon: "wallet",
    question: "How and when am I paid?",
    answer:
      "The fee the store set on a job is booked as earned the moment the customer's code closes the delivery. Your earnings and the store's payout board read the same numbers.",
  },
  {
    icon: "shield",
    question: "Can I still shop while I deliver?",
    answer:
      "Yes, from the customer dashboard. The cart is closed while you are working as a rider, so switching your active role back to customer is what opens it again.",
  },
] satisfies FaqItem[];

/** What approval keeps, read as a promise rather than a feature list. */
const PROMISE = [
  "Same email and password",
  "Past orders and reviews kept",
  "Wallet balance kept",
  "Addresses and wishlist kept",
  "Rider dashboard added beside them",
  "Shopping returns on the customer dashboard",
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

  /**
   * The one call to action, drawn twice.
   *
   * The hero reads it on the page's own surface and the closing banner reads it
   * on the brand gradient, so the same link has to wear two coats — the decision
   * behind it never changes.
   */
  const cta = (variant: "gradient" | "onGradient") => (
    <Link
      href={ctaHref}
      className={
        variant === "gradient"
          ? "inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-bold text-[var(--on-grad-text)] shadow-md transition-all hover:shadow-lg"
          : "inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-[var(--brand-flat)] shadow-lg transition-transform hover:-translate-y-0.5"
      }
    >
      {ctaLabel}
      <ArrowRight className="w-4 h-4" />
    </Link>
  );

  return (
    <div className="py-8 space-y-16">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-sm sm:p-10">
        <div className="pointer-events-none absolute -right-28 -top-32 h-72 w-72 rounded-full bg-[var(--brand-flat)]/12 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-[var(--brand-flat)]/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(var(--border-color)_1px,transparent_1px)] [background-size:20px_20px]" />

        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-flat)]/25 bg-[var(--brand-flat)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-flat)]">
              <Bike className="w-3 h-3" />
              Ride with Sparq
            </span>

            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-[var(--foreground)] sm:text-4xl">
              Turn your spare hours into{" "}
              <span className="text-gradient-primary">paid deliveries</span>
              {firstName ? `, ${firstName}` : ""}
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-[var(--foreground-muted)]">
              Apply as a Sparq delivery rider on the account you already have. No second sign-up,
              no fresh password — approval adds the rider dashboard beside the shopping you are
              already doing.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {cta("gradient")}
              <Link
                href="/become-a-rider/status"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
              >
                Check my application
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-[10px] font-semibold text-[var(--foreground-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Reviewed by a person
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Same login, one account
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Paid per delivered job
              </span>
            </div>
          </div>

          {/* The promise, in one card: what approval adds and what it leaves alone. */}
          <div className="relative">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5 shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Customer → Rider
              </p>
              <ul className="mt-3 space-y-2.5">
                {PROMISE.map((line) => (
                  <li
                    key={line}
                    className="flex items-center gap-2 text-[11px] text-[var(--foreground)]"
                  >
                    <BadgeCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3.5 shadow-2xs">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-[var(--on-grad-text)] shadow-xs">
                <Navigation className="w-4 h-4" />
              </span>
              <p className="text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                <span className="font-bold text-[var(--foreground)]">Live tracking</span> — the
                customer follows your position from the moment you start the delivery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── At a glance ── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AT_A_GLANCE.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-flat)]/12 text-[var(--brand-flat)]">
                <Icon className="w-4.5 h-4.5" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-extrabold leading-none tracking-tight text-[var(--foreground)]">
                  {item.value}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-[var(--foreground-muted)]">
                  {item.label}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── How it works ── */}
      <section className="space-y-6">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-bold text-[var(--foreground)]">How it works</h2>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            Four steps, and only the first one is yours.
          </p>
        </header>

        <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="group relative rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-[var(--brand-flat)]/35 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-flat)]/12 text-[var(--brand-flat)] transition-all group-hover:bg-brand-gradient group-hover:text-[var(--on-grad-text)]">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="text-2xl font-black leading-none text-[var(--foreground-muted)]/25">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-3.5 text-[13px] font-bold text-[var(--foreground)]">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                  {step.text}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── Perks ── */}
      <section className="space-y-6">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Why riders choose Sparq</h2>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            The same delivery network the stores already use, opened to you.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {PERKS.map((perk) => {
            const Icon = perk.icon;
            return (
              <article
                key={perk.title}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-[var(--on-grad-text)] shadow-xs">
                  <Icon className="w-5 h-5" />
                </span>
                <h3 className="mt-3.5 text-[13px] font-bold text-[var(--foreground)]">
                  {perk.title}
                </h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                  {perk.text}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── What you will need ── */}
      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div className="space-y-3 lg:sticky lg:top-24">
          <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-alt)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            <ListChecks className="w-3 h-3" />
            Before you apply
          </span>
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            Have these ready and the form takes minutes
          </h2>
          <p className="text-xs leading-relaxed text-[var(--foreground-muted)]">
            The documents are uploaded as photos straight from your phone — there is no link to
            paste and nothing to host somewhere first. An application sent back for a clearer
            photo is the one thing that slows a review down.
          </p>
          <p className="text-[11px] leading-relaxed text-[var(--foreground-muted)]">
            Every application is read by a person. We never approve automatically, and a rejection
            always comes with the reason so you can fix it and apply again.
          </p>
        </div>

        <div className="space-y-2.5">
          {REQUIREMENTS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-start gap-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-flat)]/12 text-[var(--brand-flat)]">
                  <Icon className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--foreground)]">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                    {item.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="space-y-5">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Questions before you ride</h2>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            The six that decide whether an application gets started at all.
          </p>
        </header>

        <div className="mx-auto max-w-3xl">
          <FaqAccordion items={FAQS} />
        </div>
      </section>

      {/* ── Closing call ── */}
      <section className="relative overflow-hidden rounded-3xl bg-brand-gradient p-8 text-center shadow-md sm:p-12">
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="relative space-y-3">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-[var(--on-grad-text)] backdrop-blur-sm">
            <Bike className="w-6 h-6" />
          </span>
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--on-grad-text)] sm:text-2xl">
            The road is one application away
          </h2>
          <p className="mx-auto max-w-xl text-xs leading-relaxed text-[var(--on-grad-text)]/85">
            Six steps, a review by a person, and the same login you have always used.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {cta("onGradient")}
            <Link
              href="/become-a-rider/status"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-[var(--on-grad-text)] transition-colors hover:bg-white/10"
            >
              Check my application
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
