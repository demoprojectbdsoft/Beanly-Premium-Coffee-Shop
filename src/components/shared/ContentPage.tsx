"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock, Sparkles } from "lucide-react";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { contentIcon } from "@/lib/contentIcons";
import { fillContent, type ContentDoc, type ContentVars } from "@/lib/contentPages";
import ContentGlyph from "@/components/shared/ContentGlyph";
import FaqAccordion from "@/components/shared/FaqAccordion";

/**
 * The help screens: FAQ, customer service, returns and product support.
 *
 * One renderer, four documents. The route files stay three lines each because
 * everything that makes these pages readable — the hero, the facts band, the
 * numbered walk-throughs, the accordion, the closing call — is here, and
 * everything that makes them *say* something is in `contentPages`. A fifth page
 * costs a document, not a component.
 *
 * This is a client component only because the site settings live in a context:
 * the name, phone, email and delivery promise written into the copy are the
 * owner's, not hard-coded. The document it receives is plain data, so a server
 * page can hand it over the boundary without a serialisation problem.
 */
export default function ContentPage({ doc }: { doc: ContentDoc }) {
  const { settings } = useSiteSettings();

  // Every token the copy may carry, resolved once per render. Nothing here is
  // guessed: an unset setting falls back to a sensible stand-in rather than
  // being edited out of the sentence, which is why the prose stays grammatical
  // on a fresh install.
  const vars: ContentVars = {
    site: settings.siteName || "our store",
    email: settings.supportEmail || "support@example.com",
    phone: settings.supportPhone || "our support line",
    hours: settings.openingHours || "business hours",
    address: settings.address || "our store",
    delivery: settings.shipping?.estimatedDeliveryDays || "2–4 business days",
    returns: "30 days",
  };

  const text = (value: string) => fillContent(value, vars);

  return (
    <div className="relative py-10 md:py-14">
      {/* A soft wash behind the title, so the page opens rather than starts. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,var(--brand-flat),transparent_70%)] opacity-[0.07]"
      />

      <div className="relative mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground-muted)] transition-colors hover:text-[var(--brand-flat)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to the store
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
            <Clock className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
            Last updated: {doc.updated}
          </span>
        </div>

        {/* ── Hero: the claim on the left, the numbers on the right ── */}
        <section className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="p-6 sm:p-8">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-flat)]/10 text-[var(--brand-flat)]">
                <ContentGlyph name={doc.icon} className="h-6 w-6" />
              </span>
              <span className="mt-4 inline-flex items-center gap-1 rounded-full border border-[var(--brand-flat)]/20 bg-[var(--brand-flat)]/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-[var(--brand-flat)]">
                <Sparkles className="h-3 w-3" />
                {doc.eyebrow}
              </span>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl">
                {doc.title}
              </h1>
              <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-[var(--foreground-muted)]">
                {text(doc.summary)}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <Link
                  href={doc.closing.action.href}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-bold text-[var(--on-grad-text)] shadow-md transition-shadow hover:shadow-lg"
                >
                  {doc.closing.action.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {doc.closing.secondary && (
                  <Link
                    href={doc.closing.secondary.href}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-5 py-2.5 text-sm font-bold text-[var(--foreground)] transition-colors hover:border-[var(--brand-flat)]/40 hover:text-[var(--brand-flat)]"
                  >
                    {doc.closing.secondary.label}
                  </Link>
                )}
              </div>
            </div>

            {/* The four numbers a reader wants before reading anything. */}
            <div className="grid grid-cols-2 gap-px border-t border-[var(--border-color)] bg-[var(--border-color)] lg:border-l lg:border-t-0">
              {doc.facts.map((fact) => {
                const Icon = contentIcon(fact.icon);
                return (
                  <div
                    key={fact.label}
                    className="flex flex-col justify-center gap-1 bg-[var(--surface-alt)] px-4 py-5"
                  >
                    <Icon className="h-4 w-4 text-[var(--brand-flat)]" />
                    <p className="break-words text-sm font-extrabold leading-snug text-[var(--foreground)]">
                      {text(fact.value)}
                    </p>
                    <p className="text-[11px] leading-snug text-[var(--foreground-muted)]">
                      {text(fact.label)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── The body ── */}
        <div className="space-y-4">
          {doc.sections.map((section) => {
            const Icon = contentIcon(section.icon);
            return (
              <section
                key={section.heading}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-2xs sm:p-7"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-flat)]/10 text-[var(--brand-flat)]">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <h2 className="text-lg font-extrabold tracking-tight text-[var(--foreground)]">
                    {section.heading}
                  </h2>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-[var(--foreground-muted)]">
                  {text(section.body)}
                </p>

                {section.bullets && (
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-2 text-[13px] leading-relaxed text-[var(--foreground-muted)]"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand-flat)]" />
                        <span>{text(bullet)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {section.steps && (
                  <ol className="mt-4 space-y-3">
                    {section.steps.map((step, index) => (
                      <li key={step.title} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[var(--brand-flat)]/20 bg-[var(--brand-flat)]/10 text-[11px] font-extrabold text-[var(--brand-flat)]">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-[var(--foreground)]">
                            {step.title}
                          </p>
                          <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--foreground-muted)]">
                            {text(step.body)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                {section.note && (
                  <p className="mt-4 rounded-xl border border-[var(--border-color)] border-l-2 border-l-[var(--brand-flat)] bg-[var(--surface-alt)] px-3.5 py-2.5 text-[12px] leading-relaxed text-[var(--foreground-muted)]">
                    {text(section.note)}
                  </p>
                )}
              </section>
            );
          })}
        </div>

        {/* ── The questions ── */}
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-2xs sm:p-7">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-flat)]/10 text-[var(--brand-flat)]">
              <ContentGlyph name="help" className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-[var(--foreground)]">
                Questions people actually ask
              </h2>
              <p className="text-[11px] text-[var(--foreground-muted)]">
                Tap a question to open it.
              </p>
            </div>
          </div>

          <FaqAccordion
            items={doc.faqs.map((faq) => ({
              icon: faq.icon,
              question: text(faq.question),
              answer: text(faq.answer),
            }))}
          />
        </section>

        {/* ── The way out ── */}
        <section className="relative overflow-hidden rounded-3xl bg-brand-gradient px-6 py-8 text-[var(--on-grad-text)] shadow-lg sm:px-9">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:18px_18px] opacity-60"
          />
          <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold tracking-tight">{doc.closing.heading}</h2>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed opacity-90">
                {text(doc.closing.body)}
              </p>
            </div>
            <Link
              href={doc.closing.action.href}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-extrabold text-[var(--brand-flat)] shadow-lg transition-transform hover:-translate-y-0.5"
            >
              {doc.closing.action.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
