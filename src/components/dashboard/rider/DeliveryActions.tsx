"use client";

import React, { useState } from "react";
import { Button, Modal } from "@heroui/react";
import {
  ArrowRight,
  Check,
  KeyRound,
  Loader2,
  PackageCheck,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  acceptDeliveryAction,
  advanceDeliveryAction,
  declineDeliveryAction,
} from "@/lib/action/deliveries";
import { isActiveDelivery, nextRiderStep } from "@/lib/rider";
import CompleteDeliveryDialog from "./CompleteDeliveryDialog";
import type { DeliveryRecord } from "@/types/delivery";

/**
 * Everything a rider can do to one job.
 *
 * The buttons only offer the move the lifecycle allows, and the server checks
 * the same rule again: a double tap, or a tap a second after the offer expired,
 * cannot skip a stage.
 *
 * Stopping a job is not one of the rider's moves. `Decline` answers an offer
 * that is still nobody's work, and once a job is accepted it only goes forward,
 * to the door and the customer's code. A delivery is called off by the customer
 * or by the store, never by whoever is riding it.
 */

interface DeliveryActionsProps {
  delivery: DeliveryRecord;
  /** An offer whose answer window has closed: it may only be read. */
  expired?: boolean;
  /** Row-sized buttons instead of the detail view's full-width pair. */
  compact?: boolean;
  /** Called after the server accepted a change, so the page can refresh. */
  onChanged?: () => void;
}

export default function DeliveryActions({
  delivery,
  expired = false,
  compact = false,
  onChanged,
}: DeliveryActionsProps) {
  const [busy, setBusy] = useState<string>("");
  // The only reason a rider still types is a decline: refusing an offer.
  const [isDeclineOpen, setIsDeclineOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);

  const sizeClass = compact ? "h-8 px-2.5 text-[10px]" : "h-10 px-4 text-xs";

  const run = async (
    key: string,
    action: () => Promise<{ success?: boolean; message?: string } | undefined>,
    success: string
  ) => {
    setBusy(key);
    try {
      const res = await action();
      if (res?.success === false) {
        toast.error(res?.message || "That did not go through");
        return false;
      }
      toast.success(success);
      onChanged?.();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That did not go through");
      return false;
    } finally {
      setBusy("");
    }
  };

  const handleAccept = () =>
    run("accept", () => acceptDeliveryAction(delivery._id), "Accepted. Head to the store.");

  const handleAdvance = (status: "picked_up" | "out_for_delivery") =>
    run(
      status,
      () => advanceDeliveryAction(delivery._id, status),
      status === "picked_up" ? "Marked picked up" : "On the way to the customer"
    );

  const handleDecline = async () => {
    const text = reason.trim();
    // A reason the store cannot act on is a reason not worth sending.
    if (text.length < 3) {
      toast.error("Please tell the store why you cannot take this delivery");
      return;
    }

    const ok = await run(
      "decline",
      () => declineDeliveryAction(delivery._id, text),
      "Declined. The store was told."
    );

    if (ok) {
      setIsDeclineOpen(false);
      setReason("");
    }
  };

  // ── A new offer ──
  if (delivery.status === "assigned") {
    if (expired) {
      return (
        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
          Window closed
        </span>
      );
    }

    return (
      <div className={`flex items-center gap-1.5 ${compact ? "" : "w-full"}`}>
        <Button
          size="sm"
          onPress={handleAccept}
          isDisabled={busy !== ""}
          className={`${sizeClass} rounded-xl bg-brand-gradient text-[var(--on-grad-text)] font-bold shadow-xs disabled:opacity-50`}
        >
          {busy === "accept" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              Accept
            </>
          )}
        </Button>
        <Button
          size="sm"
          onPress={() => {
            setReason("");
            setIsDeclineOpen(true);
          }}
          isDisabled={busy !== ""}
          className={`${sizeClass} rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground)] font-bold`}
        >
          <X className="w-3.5 h-3.5" />
          Decline
        </Button>

        <ReasonDialog
          isOpen={isDeclineOpen}
          onOpenChange={(open) => !open && setIsDeclineOpen(false)}
          title={`Decline ${delivery.orderNumber}?`}
          description="The store sees your reason and offers the job to another rider. Be specific: a vague reason cannot be fixed."
          placeholder="Too far, vehicle in service, already at capacity…"
          confirmLabel="Decline job"
          isBusy={busy === "decline"}
          value={reason}
          onChange={setReason}
          onConfirm={handleDecline}
        />
      </div>
    );
  }

  // ── A job in hand ──
  if (isActiveDelivery(delivery.status)) {
    const step = nextRiderStep(delivery.status);
    const canComplete = delivery.status === "out_for_delivery";

    return (
      <>
        <div className={`flex items-center gap-1.5 ${compact ? "" : "w-full flex-wrap"}`}>
          {step && (
            <Button
              size="sm"
              onPress={() => handleAdvance(step.status as "picked_up" | "out_for_delivery")}
              isDisabled={busy !== ""}
              className={`${sizeClass} rounded-xl bg-brand-gradient text-[var(--on-grad-text)] font-bold shadow-xs disabled:opacity-50`}
            >
              {busy === step.status ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <PackageCheck className="w-3.5 h-3.5" />
                  {step.label}
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </Button>
          )}

          {canComplete && (
            <Button
              size="sm"
              onPress={() => setIsCompleteOpen(true)}
              className={`${sizeClass} rounded-xl bg-emerald-600 text-white font-bold shadow-xs`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Deliver with code
            </Button>
          )}

          <CompleteDeliveryDialog
            isOpen={isCompleteOpen}
            onOpenChange={setIsCompleteOpen}
            delivery={delivery}
            onCompleted={onChanged}
          />
        </div>

        {/*
          Said because it is the question a stuck rider asks. There is no button
          here to press, so the screen names who does have one instead of leaving
          the rider to guess, and says what happens to the money either way.
        */}
        {!compact && (
          <p className="mt-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
            An accepted delivery only moves forward, and your fee is booked when it
            closes at the door. Only the customer can cancel the order, or the store
            can stop this job — so call the store if the parcel cannot get through.
          </p>
        )}
      </>
    );
  }

  return null;
}

interface ReasonDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  placeholder: string;
  confirmLabel: string;
  isBusy: boolean;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
}

/** The one dialog a rider fills in: the reason behind a decline. */
function ReasonDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  placeholder,
  confirmLabel,
  isBusy,
  value,
  onChange,
  onConfirm,
}: ReasonDialogProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-4 text-[var(--foreground)]">
            <Modal.Header className="space-y-1">
              <Modal.Heading className="text-base font-extrabold text-[var(--foreground)]">
                {title}
              </Modal.Heading>
              <p className="text-[11px] text-[var(--foreground-muted)]">{description}</p>
            </Modal.Header>

            <Modal.Body>
              <textarea
                autoFocus
                rows={3}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 text-xs bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/30 resize-none"
              />
            </Modal.Body>

            <Modal.Footer className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                onPress={() => onOpenChange(false)}
                className="h-9 px-4 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground)] text-[11px] font-bold"
              >
                Keep it
              </Button>
              <Button
                size="sm"
                onPress={onConfirm}
                isDisabled={isBusy}
                className="h-9 px-4 rounded-xl bg-rose-600 text-white text-[11px] font-bold disabled:opacity-60"
              >
                {isBusy ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sending
                  </span>
                ) : (
                  confirmLabel
                )}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
