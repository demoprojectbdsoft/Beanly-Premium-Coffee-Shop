"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Check,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";

interface WalletPaymentModalProps {
  /** Brand shown in the header, e.g. "bKash Direct". */
  gatewayName: string;
  /** Tailwind gradient used for the gateway header. */
  headerGradient: string;
  /** Tailwind background for the main button. */
  brandButtonClass: string;
  /** Tailwind background for the progress bar. */
  brandBarClass: string;
  /** Wallet logo icon. */
  icon: ReactNode;
  siteName: string;
  /** Amount already formatted with the site currency. */
  amountLabel: string;
  phone: string;
  transactionId: string;
  onClose: () => void;
  /** Called once the fake gateway run finishes successfully. */
  onSuccess: () => void;
}

// The three checks a real gateway would report back to us.
const PAYMENT_STEPS = [
  { label: "Connecting to gateway", detail: "Opening a secure channel" },
  { label: "Verifying transaction ID", detail: "Matching it with the wallet record" },
  { label: "Confirming with merchant", detail: "Locking in your payment" },
];

const STEP_DURATION_MS = 900;

// How full the progress bar is after each finished step (0 = not started).
const PROGRESS_BY_STEP = [34, 66, 92, 100];

export default function WalletPaymentModal({
  gatewayName,
  headerGradient,
  brandButtonClass,
  brandBarClass,
  icon,
  siteName,
  amountLabel,
  phone,
  transactionId,
  onClose,
  onSuccess,
}: WalletPaymentModalProps) {
  // How many of the fake checks have finished. 3 means the payment is done.
  const [finishedSteps, setFinishedSteps] = useState(0);
  const [paidAt, setPaidAt] = useState("");

  const isComplete = finishedSteps >= PAYMENT_STEPS.length;
  const progress = PROGRESS_BY_STEP[Math.min(finishedSteps, PROGRESS_BY_STEP.length - 1)];

  useEffect(() => {
    // Move through the steps one by one so the modal feels like a live gateway.
    const timers = PAYMENT_STEPS.map((_, index) =>
      setTimeout(() => {
        setFinishedSteps(index + 1);

        // Stamp the receipt in the same tick as the last check.
        if (index === PAYMENT_STEPS.length - 1) {
          setPaidAt(new Date().toLocaleTimeString());
        }
      }, STEP_DURATION_MS * (index + 1))
    );

    // Then hand the successful payment back to the checkout page.
    timers.push(
      setTimeout(() => onSuccess(), STEP_DURATION_MS * PAYMENT_STEPS.length + 200)
    );

    return () => timers.forEach((timer) => clearTimeout(timer));
    // onSuccess must be a stable callback - the checkout page uses useCallback.
  }, [onSuccess]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 sm:items-center bg-[var(--surface)]/75 animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm min-w-0 my-auto bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* ── Gateway brand header ── */}
        <div
          className={`px-4 py-3 bg-gradient-to-r ${headerGradient} text-white flex items-center justify-between`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center border border-white/30">
              {icon}
            </div>
            <div>
              <h3 className="text-xs font-black tracking-wide uppercase leading-tight">
                {gatewayName}
              </h3>
              <p className="text-[10px] text-white/80 font-medium">
                {siteName} E-Commerce
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title={isComplete ? "Close" : "Cancel payment"}
            className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* ── Amount, wallet number and TrxID summary ── */}
          <div className="rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] divide-y divide-[var(--border-color)] text-[11px]">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[var(--foreground-muted)]">Amount</span>
              <span className="text-sm font-extrabold text-[var(--foreground)]">
                {amountLabel}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[var(--foreground-muted)]">Wallet number</span>
              <span className="font-mono font-bold text-[var(--foreground)]">{phone}</span>
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-[var(--foreground-muted)]">Transaction ID</span>
              <span className="font-mono font-bold text-[var(--foreground)] truncate">
                {transactionId}
              </span>
            </div>
          </div>

          {isComplete ? (
            /* ── Success screen ── */
            <div className="space-y-3 animate-in fade-in duration-300">
              <div className="text-center space-y-1.5 py-1">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto animate-in zoom-in-50 duration-300">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <p className="text-sm font-extrabold text-[var(--foreground)]">
                  Payment Successful
                </p>
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  {amountLabel} paid to {siteName} via {gatewayName}
                </p>
              </div>

              <div className="rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] divide-y divide-[var(--border-color)] text-[11px]">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[var(--foreground-muted)]">Paid at</span>
                  <span className="font-semibold text-[var(--foreground)]">{paidAt}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[var(--foreground-muted)]">Status</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className={`w-full h-10 rounded-xl text-white text-xs font-bold transition-colors cursor-pointer ${brandButtonClass}`}
              >
                Continue to checkout
              </button>
            </div>
          ) : (
            /* ── Live processing screen ── */
            <div className="space-y-3">
              <div className="h-1.5 w-full rounded-full bg-[var(--surface-alt)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${brandBarClass}`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <ul className="space-y-2">
                {PAYMENT_STEPS.map((step, index) => {
                  const isDone = index < finishedSteps;
                  const isRunning = index === finishedSteps;

                  return (
                    <li
                      key={step.label}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
                        isDone || isRunning
                          ? "border-[var(--border-color)] bg-[var(--surface-alt)]"
                          : "border-transparent opacity-50"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          isDone
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : isRunning
                            ? "bg-primary/10 text-primary"
                            : "bg-[var(--surface-alt)] text-[var(--foreground-muted)]"
                        }`}
                      >
                        {isDone ? (
                          <Check className="w-3 h-3 stroke-[3]" />
                        ) : isRunning ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        )}
                      </span>

                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-[var(--foreground)] leading-tight">
                          {step.label}
                        </p>
                        <p className="text-[10px] text-[var(--foreground-muted)] leading-tight">
                          {isDone ? "Completed" : step.detail}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="flex items-center justify-between gap-2 pt-1">
                <p className="text-[10px] text-[var(--foreground-muted)] flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Do not close this window
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[10px] font-bold text-[var(--foreground-muted)] hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                >
                  Cancel payment
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="py-2 px-3 bg-[var(--surface-alt)] border-t border-[var(--border-color)] text-center flex items-center justify-center gap-1.5 text-[9px] text-[var(--foreground-muted)]">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>256-Bit Encrypted Gateway Simulation - Demo Only</span>
        </div>
      </div>
    </div>
  );
}
