import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Building2,
  CircleUser,
  Clock3,
  FileCheck2,
  Gauge,
  HeartHandshake,
  MapPin,
  Rocket,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Ticket,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import { getVendorPlans, asPlans, getMyVendorApplication, asApplication } from "@/lib/api/vendor";
import { getSiteSettings } from "@/lib/api/siteSettings";
import { getUserSession } from "@/lib/core/session";
import { roleOf } from "@/lib/core/roles";
import { getVendorStatusLabel } from "@/lib/vendorStatus";
import VendorPricing from "@/components/vendor/VendorPricing";
import FaqAccordion from "@/components/shared/FaqAccordion";

export const dynamic = "force-dynamic";

/**
 * The marketplace pitch, and the front door of the conversion flow.
 *
 * It is public: a visitor reads the plans before creating anything. A signed-in
 * customer sees "Apply" — which opens the multi-step form already filled from
 * their account — while an applicant whose review is open sees the state of
 * that review instead of being invited to apply twice.
 *
 * The page sells the store rather than the form: what the vendor dashboard
 * looks like once it is on, what the six steps ask for, what has to be ready
 * before starting, and the questions that stop an application being begun.
 */

const HOW_IT_WORKS = [
  {
    icon: FileCheck2,
    title: "Apply in six steps",
    text: "Your name and email arrive already filled from your account. You add the store, the address, the documents you have and the plan you want.",
  },
  {
    icon: Clock3,
    title: "The store team reviews",
    text: "Most applications are read within two working days. You are emailed at every decision, and a rejection always comes with its reason.",
  },
  {
    icon: ShieldCheck,
    title: "Approval turns on your store",
    text: "Approval grants the vendor role on the very same account. Orders, reviews, wishlist, wallet and addresses all stay where they were.",
  },
  {
    icon: Rocket,
    title: "Start selling",
    text: "The Free plan is live immediately. Paid plans unlock after the demo checkout, and every plan's limits are enforced by the API.",
  },
];

/** The form's own six steps, named so nobody is surprised by step four. */
const FORM_STEPS = [
  { icon: CircleUser, label: "Personal" },
  { icon: Store, label: "Store" },
  { icon: MapPin, label: "Address" },
  { icon: BadgeCheck, label: "Verification" },
  { icon: Building2, label: "Plan" },
  { icon: Send, label: "Review" },
];

/**
 * What the vendor gets, laid out as a bento rather than six identical tiles:
 * the two things that carry a store — the catalogue and the delivery network —
 * are given room to list what is inside them, and the rest read as footnotes.
 */
const FEATURE_TILES = [
  {
    icon: Boxes,
    title: "Your own catalogue",
    text: "Products live under your store, not the platform's, so a buyer always knows whose shelf they are reading.",
    points: ["Products, variants and stock", "Photos and galleries", "Categories and collections", "Draft before you publish"],
  },
  {
    icon: Truck,
    title: "One delivery network",
    text: "The same riders the platform runs are handed your parcels — you never arrange a courier yourself.",
    points: ["Delivery board per order", "Rider matching by area", "Live tracking for the buyer", "A code closes the hand-over"],
  },
];

const SMALL_TILES = [
  {
    icon: Ticket,
    title: "Coupons and featured slots",
    text: "Run discounts your buyers can actually use, and promote the products that deserve the spotlight.",
  },
  {
    icon: BarChart3,
    title: "Sales you can read",
    text: "Revenue, best sellers and conversion, exportable — so a decision is never a guess.",
  },
  {
    icon: HeartHandshake,
    title: "Priority support",
    text: "Paid plans move to the front of the support queue, with a named contact for the store.",
  },
];

/** What approval keeps, read as a promise rather than a feature list. */
const PROMISE = [
  "Same email and password",
  "Past orders and reviews kept",
  "Wallet balance kept",
  "Addresses and wishlist kept",
  "Vendor dashboard added beside them",
  "Shopping still allowed",
];

/**
 * What has to be ready before the form is started.
 *
 * Named up front because the store's identity is the part an applicant has to
 * think about — the documents are deliberately not on this list, since a home
 * seller has none and the marketplace must not turn one away for that.
 */
const REQUIREMENTS = [
  {
    icon: Store,
    title: "A name buyers will search for",
    text: "The store name also becomes its link. You see the slug before it is saved, and it can be changed later.",
  },
  {
    icon: MapPin,
    title: "Where the store operates",
    text: "City, area and a contact address. This is what puts your store on the map and in local results.",
  },
  {
    icon: Building2,
    title: "The plan you want to start on",
    text: "Free is live the moment you are approved. A paid plan is chosen in the form and unlocked after checkout.",
  },
  {
    icon: FileCheck2,
    title: "Documents — only if you have them",
    text: "A trade licence, TIN or company number speeds the review up. Every field on that step is optional.",
  },
];

const AT_A_GLANCE = [
  { icon: Clock3, value: "2 days", label: "Typical review time" },
  { icon: Gauge, value: "6 steps", label: "One application form" },
  { icon: Sparkles, value: "Free", label: "Plan to start on" },
  { icon: CircleUser, value: "1 account", label: "No second sign-up" },
];

const FAQS = [
  {
    icon: CircleUser,
    question: "Do I need a second account?",
    answer:
      "No. The application is linked to the account you already have. Approval changes that account's role to vendor and creates the store beside it — nothing is copied and nothing is reset.",
  },
  {
    icon: ShoppingBag,
    question: "Can I keep shopping while I sell?",
    answer:
      "Yes. A vendor may add to cart, wishlist and check out from another vendor's store. Only staff and riders are kept out of the cart.",
  },
  {
    icon: Clock3,
    question: "What happens while my application is reviewed?",
    answer:
      "Sign-in is paused until the store team decides, because an applicant holds no marketplace authority. You are emailed the outcome, and after a rejection you can sign in and apply again.",
  },
  {
    icon: ShieldAlert,
    question: "What if I am rejected?",
    answer:
      "Your account stays a customer. The reason is saved and shown on your application status page, and you may resubmit on the same application so the earlier review stays in the file.",
  },
  {
    icon: FileCheck2,
    question: "Do I need a trade licence?",
    answer:
      "No. Verification is optional — a home seller is welcome. A licence or registration number only speeds the review up.",
  },
  {
    icon: Gauge,
    question: "How do the plan limits work?",
    answer:
      "Every limit — products, featured slots, coupons — is read from the plan table by the API. Reaching a limit stops the action with a message naming the limit and the plan that lifts it.",
  },
];

interface BecomeAVendorPageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function BecomeAVendorPage({ searchParams }: BecomeAVendorPageProps) {
  const [session, settingsRes] = await Promise.all([getUserSession(), getSiteSettings()]);
  const plans = asPlans(await getVendorPlans());
  const siteName = settingsRes?.data?.siteName || "Sparq";
  const currency = settingsRes?.data?.currency;

  const role = roleOf(session);
  const isVendor = role === "vendor";
  const application = session?.id ? asApplication(await getMyVendorApplication()) : null;

  const params = await searchParams;
  const requestedPlan = ["free", "premium", "advanced"].includes(params?.plan || "")
    ? params?.plan
    : undefined;
  const applyHref = requestedPlan
    ? `/become-a-vendor/apply?plan=${requestedPlan}`
    : "/become-a-vendor/apply";

  // What the primary call-to-action should be, decided on the server so the
  // page never invites a duplicate application or an approved vendor back in.
  let ctaHref = applyHref;
  let ctaLabel = "Apply as a vendor";
  if (!session) {
    ctaHref = `/auth/login?callbackUrl=${encodeURIComponent(applyHref)}`;
    ctaLabel = "Sign in and apply";
  } else if (isVendor) {
    ctaHref = "/dashboard/vendor";
    ctaLabel = "Open your vendor dashboard";
  } else if (application) {
    ctaHref = "/become-a-vendor/status";
    ctaLabel = `Your application · ${getVendorStatusLabel(application.status)}`;
  }

  /**
   * The one call to action, drawn twice.
   *
   * The hero reads it on the page's own surface and the closing banner reads it
   * on the brand gradient — a gradient button on a gradient panel is a button
   * nobody can find, so the banner gets the solid coat instead.
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
        <div className="pointer-events-none absolute -right-32 -top-36 h-80 w-80 rounded-full bg-[var(--brand-flat)]/12 blur-3xl" />
        <div className="pointer-events-none absolute -left-28 bottom-0 h-56 w-56 rounded-full bg-[var(--brand-flat)]/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,var(--border-color)_1px,transparent_1px)] [background-size:56px_100%]" />

        <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-flat)]/25 bg-[var(--brand-flat)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-flat)]">
              <Store className="w-3 h-3" />
              Sell on {siteName}
            </span>

            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-[var(--foreground)] sm:text-4xl">
              Open a store on the account{" "}
              <span className="text-gradient-primary">you already have</span>
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-[var(--foreground-muted)]">
              Apply once, keep one login. Your orders, reviews, wishlist, wallet and addresses stay
              exactly as they are — approval only adds a store and the vendor role beside them.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {cta("gradient")}
              <Link
                href="#plans"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
              >
                See the plans
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-[10px] font-semibold text-[var(--foreground-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Free plan available
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Backend-enforced limits
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                No second account
              </span>
            </div>
          </div>

          {/* What the vendor dashboard looks like once approval turns it on. */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-md">
              <div className="flex items-center gap-3 border-b border-[var(--border-color)] bg-[var(--surface-alt)]/60 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-[var(--on-grad-text)] shadow-xs">
                  <Store className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[var(--foreground)]">
                    Your store dashboard
                  </p>
                  <p className="truncate text-[10px] text-[var(--foreground-muted)]">
                    {siteName} · Vendor
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-500/12 px-2 py-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                  <BadgeCheck className="w-3 h-3" />
                  Approved
                </span>
              </div>

              <div className="grid grid-cols-3 divide-x divide-[var(--border-color)] border-b border-[var(--border-color)]">
                {[
                  { icon: TrendingUp, label: "Revenue", value: "This month" },
                  { icon: ShoppingBag, label: "Orders", value: "Live board" },
                  { icon: Boxes, label: "Products", value: "Plan limit" },
                ].map((cell) => {
                  const Icon = cell.icon;
                  return (
                    <div key={cell.label} className="px-3 py-3.5">
                      <Icon className="w-3.5 h-3.5 text-[var(--brand-flat)]" />
                      <p className="mt-2 text-[11px] font-bold text-[var(--foreground)]">
                        {cell.label}
                      </p>
                      <p className="text-[9px] text-[var(--foreground-muted)]">{cell.value}</p>
                    </div>
                  );
                })}
              </div>

              <ul className="divide-y divide-[var(--border-color)]">
                {[
                  { icon: Truck, label: "Hand a parcel to a rider", note: "Delivery board" },
                  { icon: Ticket, label: "Publish a coupon", note: "Marketing" },
                  { icon: BarChart3, label: "Export the month", note: "Analytics" },
                ].map((row) => {
                  const Icon = row.icon;
                  return (
                    <li key={row.label} className="flex items-center gap-3 px-4 py-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-flat)]/12 text-[var(--brand-flat)]">
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[var(--foreground)]">
                        {row.label}
                      </p>
                      <span className="shrink-0 text-[9px] font-semibold text-[var(--foreground-muted)]">
                        {row.note}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3.5 shadow-2xs">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-[var(--on-grad-text)] shadow-xs">
                <Rocket className="w-4 h-4" />
              </span>
              <p className="text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                <span className="font-bold text-[var(--foreground)]">Live on approval</span> — the
                Free plan opens the moment the store team says yes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── At a glance ── */}
      <section className="grid divide-y divide-[var(--border-color)] overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        {AT_A_GLANCE.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 p-4 sm:p-5">
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

        <ol className="grid gap-6 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="relative">
                {/* The rail: it runs down the list on a phone and across it on
                    a desktop, and stops at the last node instead of hanging off
                    the end of the row. */}
                {index < HOW_IT_WORKS.length - 1 && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-7 top-14 -bottom-6 w-px bg-[var(--border-color)] sm:-bottom-4 lg:bottom-auto lg:left-14 lg:top-7 lg:-right-4 lg:h-px lg:w-auto"
                  />
                )}

                <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--brand-flat)] shadow-2xs">
                  <Icon className="w-5 h-5" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-gradient text-[9px] font-black text-[var(--on-grad-text)] shadow-xs">
                    {index + 1}
                  </span>
                </span>

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

      {/* ── What a vendor gets ── */}
      <section className="space-y-6">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-bold text-[var(--foreground)]">What a vendor gets</h2>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            The marketplace pieces that already run the platform, handed to your shop.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-6">
          {FEATURE_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <article
                key={tile.title}
                className="group rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-[var(--brand-flat)]/35 hover:shadow-md lg:col-span-3"
              >
                <div className="flex items-start gap-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-flat)]/12 text-[var(--brand-flat)] transition-all group-hover:bg-brand-gradient group-hover:text-[var(--on-grad-text)]">
                    <Icon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[var(--foreground)]">{tile.title}</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                      {tile.text}
                    </p>
                  </div>
                </div>

                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {tile.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-[10px] font-semibold text-[var(--foreground)]"
                    >
                      <BadgeCheck className="w-3.5 h-3.5 shrink-0 text-[var(--brand-flat)]" />
                      <span className="min-w-0">{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}

          {SMALL_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <article
                key={tile.title}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-md lg:col-span-2"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-[var(--on-grad-text)] shadow-xs">
                  <Icon className="w-4.5 h-4.5" />
                </span>
                <h3 className="mt-3.5 text-[13px] font-bold text-[var(--foreground)]">
                  {tile.title}
                </h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                  {tile.text}
                </p>
              </article>
            );
          })}

          {/* The reassurance that closes the pitch: selling does not cost the
              applicant their shopping. */}
          <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5 shadow-2xs lg:col-span-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 sm:w-64 sm:shrink-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-[var(--on-grad-text)] shadow-xs">
                  <Users className="w-4.5 h-4.5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-bold text-[var(--foreground)]">
                    Still a customer
                  </h3>
                  <p className="text-[10px] text-[var(--foreground-muted)]">
                    Customer → Vendor, on one login
                  </p>
                </div>
              </div>

              <ul className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {PROMISE.map((line) => (
                  <li
                    key={line}
                    className="flex items-center gap-2 text-[11px] text-[var(--foreground)]"
                  >
                    <BadgeCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="min-w-0">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </section>

      {/* ── Before you apply ── */}
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
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

        <div className="space-y-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs lg:sticky lg:top-24">
          <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-flat)]/25 bg-[var(--brand-flat)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-flat)]">
            <Send className="w-3 h-3" />
            The form itself
          </span>

          <h2 className="text-lg font-bold leading-snug text-[var(--foreground)]">
            Six steps, and your account fills the first one for you
          </h2>

          <p className="text-[11px] leading-relaxed text-[var(--foreground-muted)]">
            The name, email and phone the account already holds arrive pre-filled, so applying never
            asks for something {siteName} already knows. A half-finished form is kept on the device
            and reopened where it stopped.
          </p>

          <ol className="grid gap-2">
            {FORM_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.label}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2.5"
                >
                  <span className="text-[10px] font-black text-[var(--foreground-muted)]/60">
                    0{index + 1}
                  </span>
                  <Icon className="w-3.5 h-3.5 shrink-0 text-[var(--brand-flat)]" />
                  <span className="text-[11px] font-semibold text-[var(--foreground)]">
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── Plans ── */}
      <section id="plans" className="space-y-6 scroll-mt-24">
        <header className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-alt)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            <Gauge className="w-3 h-3" />
            Pricing
          </span>
          <h2 className="mt-3 text-xl font-bold text-[var(--foreground)]">
            Plans that grow with you
          </h2>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            Start free. Upgrade when the catalogue, the coupons or the analytics need more room —
            every limit is read from this table by the API, so what is shown is what is enforced.
          </p>
        </header>

        {plans.length > 0 ? (
          <VendorPricing plans={plans} currency={currency} />
        ) : (
          <p className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 text-center text-xs text-[var(--foreground-muted)]">
            The plan table could not be loaded right now. Please refresh in a moment.
          </p>
        )}

        <p className="mx-auto flex max-w-2xl items-start gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
          <ShieldCheck className="mt-0.5 w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          Reaching a limit stops the action with a message naming the limit and the plan that lifts
          it — nothing is silently dropped, and a plan can be changed from the vendor dashboard at
          any time.
        </p>
      </section>

      {/* ── FAQ ── */}
      <section className="space-y-5">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Questions before you apply</h2>
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
        <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.55)_50%,transparent_65%)]" />
        <div className="relative space-y-3">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-[var(--on-grad-text)] backdrop-blur-sm">
            <Store className="w-6 h-6" />
          </span>
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--on-grad-text)] sm:text-2xl">
            Your store is one application away
          </h2>
          <p className="mx-auto max-w-xl text-xs leading-relaxed text-[var(--on-grad-text)]/85">
            Six steps, a review by a person, and the same login you have always used.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {cta("onGradient")}
            <Link
              href="#plans"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-[var(--on-grad-text)] transition-colors hover:bg-white/10"
            >
              Compare the plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
