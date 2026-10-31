import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Clock3,
  FileCheck2,
  HeartHandshake,
  Rocket,
  ShieldCheck,
  Sparkles,
  Store,
  Ticket,
  Truck,
  Users,
} from "lucide-react";
import { getVendorPlans, asPlans, getMyVendorApplication, asApplication } from "@/lib/api/vendor";
import { getSiteSettings } from "@/lib/api/siteSettings";
import { getUserSession } from "@/lib/core/session";
import { roleOf } from "@/lib/core/roles";
import { getVendorStatusLabel } from "@/lib/vendorStatus";
import VendorPricing from "@/components/vendor/VendorPricing";

export const dynamic = "force-dynamic";

/**
 * The marketplace pitch, and the front door of the conversion flow.
 *
 * It is public: a visitor reads the plans before creating anything. A signed-in
 * customer sees "Apply" — which opens the multi-step form already filled from
 * their account — while an applicant whose review is open sees the state of
 * that review instead of being invited to apply twice.
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

const BENEFITS = [
  {
    icon: Boxes,
    title: "Your own catalogue",
    text: "Products, stock, images and variants, organised under your store rather than the platform's.",
  },
  {
    icon: Truck,
    title: "One delivery network",
    text: "Hand a parcel to a rider from the delivery board and let the buyer follow it live.",
  },
  {
    icon: Ticket,
    title: "Coupons and featured slots",
    text: "Run discounts your buyers can actually use, and promote the products that deserve the spotlight.",
  },
  {
    icon: BarChart3,
    title: "Sales you can read",
    text: "Revenue, best sellers and conversion, exportable, so a decision is never a guess.",
  },
  {
    icon: HeartHandshake,
    title: "Priority support",
    text: "Paid plans move to the front of the support queue, with a named contact for the store.",
  },
  {
    icon: Users,
    title: "Still a customer",
    text: "A vendor keeps shopping. Buy from other vendors with the same login, same wallet, same history.",
  },
];

const FAQS = [
  {
    question: "Do I need a second account?",
    answer:
      "No. The application is linked to the account you already have. Approval changes that account's role to vendor and creates the store beside it — nothing is copied and nothing is reset.",
  },
  {
    question: "Can I keep shopping while I sell?",
    answer:
      "Yes. A vendor may add to cart, wishlist and check out from another vendor's store. Only staff and riders are kept out of the cart.",
  },
  {
    question: "What happens while my application is reviewed?",
    answer:
      "Sign-in is paused until the store team decides, because an applicant holds no marketplace authority. You are emailed the outcome, and after a rejection you can sign in and apply again.",
  },
  {
    question: "What if I am rejected?",
    answer:
      "Your account stays a customer. The reason is saved and shown on your application status page, and you may resubmit on the same application so the earlier review stays in the file.",
  },
  {
    question: "Do I need a trade licence?",
    answer:
      "No. Verification is optional — a home seller is welcome. A licence or registration number only speeds the review up.",
  },
  {
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

  /** The one call to action, which changes with who is reading the page. */
  const primaryAction = () => {
    if (!session) {
      return (
        <Link
          href={`/auth/login?callbackUrl=${encodeURIComponent(applyHref)}`}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-3 text-xs font-bold text-[var(--on-grad-text)] shadow-md transition-all hover:shadow-lg"
        >
          Sign in and apply
          <ArrowRight className="w-4 h-4" />
        </Link>
      );
    }

    if (isVendor) {
      return (
        <Link
          href="/dashboard/vendor"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-3 text-xs font-bold text-[var(--on-grad-text)] shadow-md transition-all hover:shadow-lg"
        >
          Open your vendor dashboard
          <ArrowRight className="w-4 h-4" />
        </Link>
      );
    }

    if (application) {
      return (
        <Link
          href="/become-a-vendor/status"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-3 text-xs font-bold text-[var(--on-grad-text)] shadow-md transition-all hover:shadow-lg"
        >
          Your application · {getVendorStatusLabel(application.status)}
          <ArrowRight className="w-4 h-4" />
        </Link>
      );
    }

    return (
      <Link
        href={applyHref}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-3 text-xs font-bold text-[var(--on-grad-text)] shadow-md transition-all hover:shadow-lg"
      >
        Apply as a vendor
        <ArrowRight className="w-4 h-4" />
      </Link>
    );
  };

  return (
    <div className="py-8 space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-sm sm:p-10">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--brand-flat)]/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-flat)]/25 bg-[var(--brand-flat)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-flat)]">
              <Store className="w-3 h-3" />
              Sell on {siteName}
            </span>

            <h1 className="text-3xl font-bold leading-tight text-[var(--foreground)] sm:text-4xl">
              Open your store with the account you already have.
            </h1>

            <p className="max-w-xl text-sm text-[var(--foreground-muted)]">
              Apply once, keep one login. Your orders, reviews, wishlist, wallet and addresses stay
              exactly as they are — approval only adds a store and the vendor role beside them.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {primaryAction()}
              <Link
                href="#plans"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-5 py-3 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
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

          {/* The conversion promise, in one card */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5 shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              Customer → Vendor
            </p>
            <ul className="mt-3 space-y-2.5">
              {[
                "Same email and password",
                "Past orders and reviews kept",
                "Wallet balance kept",
                "Addresses kept",
                "Wishlist kept",
                "Shopping still allowed",
              ].map((line) => (
                <li key={line} className="flex items-center gap-2 text-[11px] text-[var(--foreground)]">
                  <BadgeCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-6">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-bold text-[var(--foreground)]">How it works</h2>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            Four steps, and only the first one is yours.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step, index) => {
            const Icon = step.icon;
            return (
              <article
                key={step.title}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-flat)]/12 text-[var(--brand-flat)]">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-bold text-[var(--foreground-muted)]">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-3 text-xs font-bold text-[var(--foreground)]">{step.title}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                  {step.text}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Benefits */}
      <section className="space-y-6">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-bold text-[var(--foreground)]">What a vendor gets</h2>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            The marketplace pieces that already run the store, handed to your shop.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article
                key={benefit.title}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-[var(--on-grad-text)] shadow-xs">
                  <Icon className="w-4 h-4" />
                </span>
                <h3 className="mt-3 text-xs font-bold text-[var(--foreground)]">{benefit.title}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                  {benefit.text}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="space-y-6 scroll-mt-24">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Plans that grow with you</h2>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            Start free. Upgrade when the catalogue, the coupons or the analytics need more room.
          </p>
        </header>

        {plans.length > 0 ? (
          <VendorPricing plans={plans} currency={currency} />
        ) : (
          <p className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 text-center text-xs text-[var(--foreground-muted)]">
            The plan table could not be loaded right now. Please refresh in a moment.
          </p>
        )}
      </section>

      {/* FAQ */}
      <section className="space-y-5">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Questions before you apply</h2>
        </header>

        <div className="mx-auto max-w-3xl space-y-2">
          {FAQS.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-[var(--foreground)]">
                {faq.question}
                <span className="text-[var(--foreground-muted)] transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing call */}
      <section className="rounded-3xl border border-[var(--border-color)] bg-brand-gradient p-6 text-center shadow-md sm:p-10">
        <h2 className="text-xl font-bold text-[var(--on-grad-text)]">
          Your store is one application away
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-xs text-[var(--on-grad-text)]/85">
          Six steps, a review, and the same login you have always used.
        </p>
        <div className="mt-5 flex justify-center">{primaryAction()}</div>
      </section>
    </div>
  );
}
