"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, ListBox, Modal, Select, Switch } from "@heroui/react";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  Crown,
  Eye,
  EyeOff,
  Layers,
  Pencil,
  Percent,
  Plus,
  Sparkles,
  Timer,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  createVendorPlan,
  deleteVendorPlan,
  updateVendorPlan,
  type VendorPlanPayload,
} from "@/lib/action/vendor";
import HeroUIDateTimePicker from "@/components/shared/HeroUIDateTimePicker";
import { formatPrice } from "@/lib/currency";
import { formatOrderDate } from "@/lib/dateTime";
import {
  EXPORT_LABELS,
  isPaidPlan,
  planCycles,
  planEffectivePrice,
  planFeatureList,
  planOfferLive,
  planPrice,
} from "@/lib/vendorPlan";
import type { BillingCycle, VendorPlan } from "@/types/vendor";

/**
 * The store team's price list for vendors.
 *
 * A plan here is exactly the row the pricing page, the limit checks and the
 * checkout read, so adding, retiring or deleting one changes the product
 * everywhere at once. The board refuses two things on purpose: the free rung
 * cannot be deleted, and a plan a vendor is still on cannot be deleted until
 * those periods end — the API enforces both and says so in the toast.
 */

/**
 * The switches that decide what a plan actually does.
 *
 * Only services the platform enforces are listed. Storefront styling and
 * campaign labels used to sit here too, but nothing read them, so a plan could
 * promise something no screen or check delivered — those columns keep their
 * stored values and stay off the board.
 */
const CAPABILITY_FIELDS = [
  {
    key: "analytics",
    label: "Analytics depth",
    options: [
      { value: "basic", label: "Basic — last 30 days" },
      { value: "detailed", label: "Detailed — last 90 days" },
      { value: "advanced", label: "Advanced — last 12 months" },
    ],
  },
  {
    key: "exports",
    label: "Report exports",
    options: [
      { value: "none", label: "No export" },
      { value: "csv", label: "CSV only" },
      { value: "csv+pdf", label: "CSV + PDF" },
    ],
  },
  {
    key: "support",
    label: "Support",
    options: [
      { value: "standard", label: "Standard" },
      { value: "priority", label: "Priority" },
    ],
  },
] as const;

type CapabilityKey = (typeof CAPABILITY_FIELDS)[number]["key"];

interface PlanForm {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxProducts: number;
  featuredProducts: number;
  featuredDurationDays: number;
  activeCoupons: number;
  commissionPercent: number;
  offerPercent: number;
  offerReason: string;
  offerEndsAt: string;
  isActive: boolean;
  billingCycles: BillingCycle[];
  capabilities: Record<CapabilityKey, string>;
}

const BLANK_FORM: PlanForm = {
  name: "",
  monthlyPrice: 0,
  yearlyPrice: 0,
  maxProducts: 10,
  featuredProducts: 0,
  featuredDurationDays: 0,
  activeCoupons: 0,
  commissionPercent: 0,
  offerPercent: 0,
  offerReason: "",
  offerEndsAt: "",
  isActive: true,
  billingCycles: ["monthly", "yearly"],
  capabilities: {
    analytics: "basic",
    exports: "none",
    support: "standard",
  },
};

function formFromPlan(plan: VendorPlan): PlanForm {
  return {
    name: plan.name,
    monthlyPrice: Number(plan.monthlyPrice) || 0,
    yearlyPrice: Number(plan.yearlyPrice) || 0,
    maxProducts: Number(plan.maxProducts) || 0,
    featuredProducts: Number(plan.featuredProducts) || 0,
    featuredDurationDays: Number(plan.featuredDurationDays) || 0,
    activeCoupons: Number(plan.activeCoupons) || 0,
    commissionPercent: Number(plan.commissionPercent) || 0,
    offerPercent: Number(plan.offerPercent) || 0,
    offerReason: plan.offerReason || "",
    offerEndsAt: plan.offerEndsAt || "",
    isActive: plan.isActive !== false,
    billingCycles: planCycles(plan),
    capabilities: {
      analytics: plan.analytics || "basic",
      exports: plan.exports || "none",
      support: plan.support || "standard",
    },
  };
}

function payloadFromForm(form: PlanForm): VendorPlanPayload {
  return {
    name: form.name.trim(),
    monthlyPrice: Math.max(0, Number(form.monthlyPrice) || 0),
    yearlyPrice: Math.max(0, Number(form.yearlyPrice) || 0),
    maxProducts: Math.max(0, Number(form.maxProducts) || 0),
    featuredProducts: Math.max(0, Number(form.featuredProducts) || 0),
    featuredDurationDays: Math.max(0, Number(form.featuredDurationDays) || 0),
    activeCoupons: Math.max(0, Number(form.activeCoupons) || 0),
    commissionPercent: Math.min(100, Math.max(0, Number(form.commissionPercent) || 0)),
    // Zero means no offer; a cleared deadline keeps the offer open until the
    // store team turns the percentage back to zero.
    offerPercent: Math.min(99, Math.max(0, Number(form.offerPercent) || 0)),
    offerReason: form.offerReason.trim(),
    offerEndsAt: form.offerEndsAt ? form.offerEndsAt : null,
    isActive: form.isActive,
    billingCycles: form.billingCycles,
    ...form.capabilities,
  };
}

/** One labelled number the plan owns. */
function NumberField({
  label,
  hint,
  value,
  onChange,
  min = 0,
  step = 1,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-[var(--foreground)]">{label}</label>
      <Input
        type="number"
        min={min}
        step={step}
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {hint && <p className="text-[10px] text-[var(--foreground-muted)]">{hint}</p>}
    </div>
  );
}

interface VendorPlansClientProps {
  initialPlans: VendorPlan[];
  currency: string;
}

/** One capability as a HeroUI select, so every control on the board matches. */
function CapabilitySelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-[var(--foreground)]">{label}</label>
      <Select
        selectedKey={value}
        onSelectionChange={(key) => onChange(String(key))}
        aria-label={label}
      >
        <Select.Trigger className="w-full cursor-pointer">
          <Select.Value>{selected?.label ?? value}</Select.Value>
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover className="w-56 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-1.5 shadow-xl">
          <ListBox>
            {options.map((option) => (
              <ListBox.Item
                key={option.value}
                id={option.value}
                textValue={option.label}
                className="cursor-pointer"
              >
                {option.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}

export default function VendorPlansClient({ initialPlans, currency }: VendorPlansClientProps) {
  const router = useRouter();

  // The board re-reads the list on every refresh, so the rows are the prop —
  // no mirrored copy that a stale click could disagree with.
  const plans = useMemo(
    () => (Array.isArray(initialPlans) ? initialPlans : []),
    [initialPlans]
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<VendorPlan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const money = (amount: number) =>
    formatPrice(amount, currency, { showDecimals: amount % 1 !== 0 });

  const counts = useMemo(
    () => ({
      onOffer: plans.filter((plan) => plan.isActive !== false).length,
      retired: plans.filter((plan) => plan.isActive === false).length,
      paid: plans.filter(isPaidPlan).length,
    }),
    [plans]
  );

  const openNew = () => {
    setEditingId(null);
    setForm(BLANK_FORM);
    setEditorOpen(true);
  };

  const openEdit = (plan: VendorPlan) => {
    setEditingId(plan.id);
    setForm(formFromPlan(plan));
    setEditorOpen(true);
  };

  const setCapability = (key: CapabilityKey, value: string) => {
    setForm((prev) => ({ ...prev, capabilities: { ...prev.capabilities, [key]: value } }));
  };

  const toggleCycle = (cycle: BillingCycle) => {
    setForm((prev) => {
      const has = prev.billingCycles.includes(cycle);
      const next = has
        ? prev.billingCycles.filter((item) => item !== cycle)
        : [...prev.billingCycles, cycle];

      // A plan cannot be sold no way at all; the last cycle stays pressed.
      if (next.length === 0) return prev;
      return { ...prev, billingCycles: next };
    });
  };

  const save = async () => {
    if (saving) return;

    const payload = payloadFromForm(form);
    if (!payload.name || payload.name.length < 2) {
      toast.warning("Give the plan a name of at least two characters.");
      return;
    }

    setSaving(true);
    try {
      const res = editingId
        ? await updateVendorPlan(editingId, payload)
        : await createVendorPlan({ ...payload, name: payload.name });

      if (res?.success === false) {
        toast.error(res.message || "The plan could not be saved");
        return;
      }

      toast.success(editingId ? "Plan updated" : `${payload.name} added to the price list`);
      setEditorOpen(false);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (plan: VendorPlan) => {
    if (busyId) return;

    setBusyId(plan.id);
    try {
      const res = await updateVendorPlan(plan.id, { isActive: plan.isActive === false });
      if (res?.success === false) {
        toast.error(res.message || "The plan could not be changed");
        return;
      }
      toast.success(
        plan.isActive === false
          ? `${plan.name} is back on offer`
          : `${plan.name} is retired — vendors keep the periods they paid for`
      );
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || "An error occurred");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    try {
      const res = await deleteVendorPlan(deleteTarget.id);
      if (res?.success === false) {
        toast.error(res.message || "The plan could not be deleted");
        return;
      }
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || "An error occurred");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Vendor plans</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            The price list sellers buy from. Changes reach the pricing page, the limits and the
            checkout immediately.
          </p>
        </div>

        <Button
          onPress={openNew}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-xs font-bold text-[var(--on-grad-text)] shadow-xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          New plan
        </Button>
      </header>

      <ul className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "On offer", value: counts.onOffer, icon: BadgeCheck },
          { label: "Paid plans", value: counts.paid, icon: Layers },
          { label: "Retired", value: counts.retired, icon: EyeOff },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <li
              key={stat.label}
              className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3 shadow-2xs"
            >
              <span className="flex items-center gap-2 text-[11px] font-semibold text-[var(--foreground-muted)]">
                <Icon className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
                {stat.label}
              </span>
              <span className="text-base font-bold text-[var(--foreground)]">{stat.value}</span>
            </li>
          );
        })}
      </ul>

      {plans.length === 0 ? (
        <Card className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-2xs">
          <p className="text-xs font-bold text-[var(--foreground)]">No plans on the price list</p>
          <p className="mt-1 max-w-md text-[11px] leading-relaxed text-[var(--foreground-muted)]">
            The three starting plans are written the first time the list is read. Reload this
            board, or add a plan of your own.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const retired = plan.isActive === false;
            const cycles = planCycles(plan);
            const paid = isPaidPlan(plan);
            const offer = planOfferLive(plan);
            const price = planEffectivePrice(plan, "monthly");
            const listPrice = planPrice(plan, "monthly");

            return (
              <article
                key={plan.id}
                className={`flex flex-col rounded-2xl border bg-[var(--surface-elevated)] p-4 shadow-2xs ${
                  retired ? "border-dashed border-[var(--border-color)] opacity-80" : "border-[var(--border-color)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-1.5 truncate text-sm font-bold text-[var(--foreground)]">
                      <Crown className="h-3.5 w-3.5 shrink-0 text-[var(--brand-flat)]" />
                      {plan.name}
                    </h2>
                    <p className="truncate font-mono text-[10px] text-[var(--foreground-muted)]">
                      {plan.id}
                    </p>
                  </div>

                  <span
                    className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      retired
                        ? "border-[var(--border-color)] bg-[var(--surface-alt)] text-[var(--foreground-muted)]"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200"
                    }`}
                  >
                    {retired ? "Retired" : "On offer"}
                  </span>
                </div>

                <p className="mt-3 flex flex-wrap items-baseline gap-1.5 text-lg font-bold text-[var(--foreground)]">
                  {paid ? money(price) : "Free"}
                  {paid && offer && (
                    <span className="text-[10px] font-semibold text-[var(--foreground-muted)] line-through">
                      {money(listPrice)}
                    </span>
                  )}
                  {paid && (
                    <span className="text-[10px] font-semibold text-[var(--foreground-muted)]">
                      / month
                    </span>
                  )}
                </p>
                {plan.yearlyPrice > 0 && (
                  <p className="text-[10px] text-[var(--foreground-muted)]">
                    or {money(plan.yearlyPrice)} / year
                  </p>
                )}
                {paid && offer && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <Percent className="h-3 w-3" />
                    {Number(plan.offerPercent) || 0}% off
                    {plan.offerReason ? ` · ${plan.offerReason}` : ""}
                    {plan.offerEndsAt ? ` · until ${formatOrderDate(plan.offerEndsAt)}` : ""}
                  </p>
                )}

                <ul className="mt-3 space-y-1.5">
                  {[
                    { label: "Active products", value: plan.maxProducts },
                    { label: "Featured products", value: plan.featuredProducts },
                    { label: "Active coupons", value: plan.activeCoupons },
                    { label: "Commission", value: `${Number(plan.commissionPercent) || 0}%` },
                    { label: "Analytics", value: plan.analytics },
                    { label: "Exports", value: EXPORT_LABELS[plan.exports] ?? "None" },
                    { label: "Sold", value: cycles.join(" · ") },
                  ].map((fact) => (
                    <li
                      key={fact.label}
                      className="flex items-center justify-between gap-2 text-[10px]"
                    >
                      <span className="text-[var(--foreground-muted)]">{fact.label}</span>
                      <span className="font-semibold capitalize text-[var(--foreground)]">{fact.value}</span>
                    </li>
                  ))}
                </ul>

                <ul className="mt-3 space-y-1">
                  {planFeatureList(plan).slice(0, 4).map((line) => (
                    <li
                      key={line}
                      className="flex items-start gap-1 text-[10px] leading-relaxed text-[var(--foreground-muted)]"
                    >
                      <Check className="mt-0.5 h-2.5 w-2.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      {line}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex items-center gap-1.5 pt-4">
                  <button
                    type="button"
                    onClick={() => openEdit(plan)}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-[var(--border-color)] px-2 py-1.5 text-[10px] font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleActive(plan)}
                    disabled={busyId === plan.id}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-[var(--border-color)] px-2 py-1.5 text-[10px] font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:opacity-60 cursor-pointer"
                  >
                    {retired ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {retired ? "Restore" : "Retire"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(plan)}
                    disabled={plan.id === "free"}
                    title={plan.id === "free" ? "The free plan cannot be deleted" : "Delete plan"}
                    className="inline-flex items-center justify-center rounded-xl border border-rose-200 px-2 py-1.5 text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Editor */}
      <Modal isOpen={editorOpen} onOpenChange={setEditorOpen}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog className="space-y-5 rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 text-[var(--foreground)] shadow-2xl max-h-[90dvh] overflow-y-auto">
              <Modal.Header className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
                <Modal.Heading className="flex items-center gap-2 text-base font-bold text-[var(--foreground)]">
                  <Sparkles className="h-4 w-4 text-[var(--brand-flat)]" />
                  {editingId ? "Edit plan" : "New plan"}
                </Modal.Heading>
                <Modal.CloseTrigger className="cursor-pointer rounded-lg p-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                  ✕
                </Modal.CloseTrigger>
              </Modal.Header>

              <Modal.Body>
                <form
                  id="plan-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void save();
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Plan name
                      </label>
                      <Input
                        type="text"
                        value={form.name}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, name: event.target.value }))
                        }
                        placeholder="e.g. Growth"
                      />
                      <p className="text-[10px] text-[var(--foreground-muted)]">
                        {editingId
                          ? "Renaming keeps the same plan id, so vendors already on it stay put."
                          : "The plan id is made from this name."}
                      </p>
                    </div>

                    <NumberField
                      label={`Monthly price (${currency})`}
                      hint="0 makes it a free plan with no checkout."
                      value={form.monthlyPrice}
                      onChange={(value) => setForm((prev) => ({ ...prev, monthlyPrice: value }))}
                    />
                    <NumberField
                      label={`Yearly price (${currency})`}
                      hint="Leave 0 to sell this plan monthly only."
                      value={form.yearlyPrice}
                      onChange={(value) => setForm((prev) => ({ ...prev, yearlyPrice: value }))}
                    />

                    <NumberField
                      label="Active products"
                      hint="How many live listings the plan allows."
                      value={form.maxProducts}
                      onChange={(value) => setForm((prev) => ({ ...prev, maxProducts: value }))}
                    />
                    <NumberField
                      label="Featured products"
                      hint="Paid placements included in the plan."
                      value={form.featuredProducts}
                      onChange={(value) => setForm((prev) => ({ ...prev, featuredProducts: value }))}
                    />
                    <NumberField
                      label="Featured days"
                      hint="How long each included placement runs."
                      value={form.featuredDurationDays}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, featuredDurationDays: value }))
                      }
                    />
                    <NumberField
                      label="Active coupons"
                      hint="Discount codes the shop may run at once."
                      value={form.activeCoupons}
                      onChange={(value) => setForm((prev) => ({ ...prev, activeCoupons: value }))}
                    />
                    <NumberField
                      label="Commission (%)"
                      hint="Taken from each delivered sale while on this plan."
                      value={form.commissionPercent}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, commissionPercent: value }))
                      }
                    />
                  </div>

                  {/* A price offer: the real price stays, the discount is
                      applied while the deadline is ahead. */}
                  <div className="space-y-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-alt)]/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
                        <Percent className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
                        Price offer
                      </p>
                      <span className="text-[10px] text-[var(--foreground-muted)]">
                        Applies to both cycles
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[var(--foreground)]">
                          Discount (%)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          max={99}
                          step={1}
                          value={String(form.offerPercent)}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              offerPercent: Number(event.target.value),
                            }))
                          }
                        />
                        <p className="text-[10px] text-[var(--foreground-muted)]">
                          0 runs no offer. The checkout charges the discounted price.
                        </p>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[var(--foreground)]">
                          Reason
                        </label>
                        <Input
                          type="text"
                          value={form.offerReason}
                          placeholder="e.g. New vendor week"
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, offerReason: event.target.value }))
                          }
                        />
                        <p className="text-[10px] text-[var(--foreground-muted)]">
                          Shown on the pricing card next to the discount.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]">
                        <Timer className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
                        Offer ends
                      </label>
                      <HeroUIDateTimePicker
                        label="Offer ends"
                        value={form.offerEndsAt}
                        onChange={(isoString) =>
                          setForm((prev) => ({ ...prev, offerEndsAt: isoString }))
                        }
                        helperText="After this moment the full price returns on its own. Clear it for an open-ended offer."
                        showPresets
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-[var(--foreground)]">Billed</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(["monthly", "yearly"] as BillingCycle[]).map((cycle) => {
                        const active = form.billingCycles.includes(cycle);
                        return (
                          <button
                            key={cycle}
                            type="button"
                            onClick={() => toggleCycle(cycle)}
                            aria-pressed={active}
                            className={`rounded-xl border px-3 py-1.5 text-[10px] font-bold capitalize transition-colors cursor-pointer ${
                              active
                                ? "border-[var(--brand-flat)] bg-[var(--brand-flat)]/10 text-[var(--brand-flat)]"
                                : "border-[var(--border-color)] text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)]"
                            }`}
                          >
                            {cycle}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-[var(--foreground-muted)]">
                      A cycle that is not pressed is refused at checkout.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {CAPABILITY_FIELDS.map((field) => (
                      <CapabilitySelect
                        key={field.key}
                        label={field.label}
                        value={form.capabilities[field.key]}
                        options={field.options}
                        onChange={(value) => setCapability(field.key, value)}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)]/60 px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-[var(--foreground)]">On offer</p>
                      <p className="text-[10px] text-[var(--foreground-muted)]">
                        Retiring hides the plan from new checkouts; live periods still run.
                      </p>
                    </div>
                    <Switch
                      isSelected={form.isActive}
                      onChange={(value) => setForm((prev) => ({ ...prev, isActive: value }))}
                    >
                      <Switch.Content className="cursor-pointer">
                        <Switch.Control className="cursor-pointer">
                          <Switch.Thumb className="cursor-pointer" />
                        </Switch.Control>
                      </Switch.Content>
                    </Switch>
                  </div>
                </form>
              </Modal.Body>

              <Modal.Footer className="flex items-center justify-end gap-3 border-t border-[var(--border-color)] pt-4">
                <Button
                  variant="outline"
                  onPress={() => setEditorOpen(false)}
                  className="rounded-xl border border-[var(--border-color)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="plan-form"
                  isDisabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-5 py-2 text-xs font-bold text-[var(--on-grad-text)] shadow-xs cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  {saving ? "Saving..." : editingId ? "Save changes" : "Add plan"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog className="space-y-4 rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 text-[var(--foreground)] shadow-2xl">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-500 dark:border-rose-900/40 dark:bg-rose-950/60">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <div className="space-y-2 text-center">
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Delete {deleteTarget?.name}?
                </h3>
                <p className="text-xs text-[var(--foreground-muted)]">
                  The plan leaves the price list for good. Vendors still on it cannot be deleted
                  away — retry once their periods end, or retire the plan instead.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onPress={() => setDeleteTarget(null)}
                  className="rounded-xl border border-[var(--border-color)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onPress={() => void confirmDelete()}
                  isDisabled={deleting}
                  className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-rose-700 cursor-pointer"
                >
                  {deleting ? "Deleting..." : "Delete plan"}
                </Button>
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
