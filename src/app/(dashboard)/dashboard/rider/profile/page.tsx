import React from "react";
import RiderProfileClient, { RiderAccount } from "./RiderProfileClient";
import { getRequiredRole } from "@/lib/core/session";
import { getUserById } from "@/lib/api/user";
import { asRiderApplication, getMyRiderApplication } from "@/lib/api/rider";
import type { RiderApplication } from "@/types/rider";

export const dynamic = "force-dynamic";

/** Only the account fields this page reads; the API returns the whole user row. */
interface RiderRecord {
  _id?: string;
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  phone?: string | null;
  bio?: string | null;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  licenseNumber?: string | null;
  availability?: string | null;
  riderStatus?: string | null;
  createdAt?: string | Date | null;
}

function memberSince(value?: string | Date | null): string {
  if (!value) return "Recently";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * The rider's own file.
 *
 * Two rows make this page: the account, which is what the dashboard and the
 * customer's tracking screen read, and the application the wizard wrote, which
 * holds everything else — the birthday, the emergency contact, the service
 * area, the licence expiry, the four document uploads, the days and hours the
 * rider prefers and the experience they claimed. Both are fetched here so the
 * form can show every one of those answers, whether it was ever filled in or
 * not, and let the rider change any of them.
 */
export default async function RiderProfilePage() {
  const session = await getRequiredRole("rider");

  // A failed read is not a reason to lose the page: the session still carries
  // the identity, and an unreachable file read simply shows an empty form.
  const [userResponse, applicationResponse] = await Promise.all([
    getUserById(session.id).catch(() => null),
    getMyRiderApplication().catch(() => null),
  ]);

  const record = (userResponse?.data as RiderRecord) ?? null;
  const merged: RiderRecord = record ?? {
    id: session.id,
    name: session.name,
    email: session.email,
  };

  const account: RiderAccount = {
    id: merged._id || merged.id || session.id,
    name: merged.name || session.name || "",
    email: merged.email || session.email || "",
    image: merged.image || "",
    phone: merged.phone || "",
    bio: merged.bio || "",
    vehicleType: merged.vehicleType || "",
    vehicleNumber: merged.vehicleNumber || "",
    licenseNumber: merged.licenseNumber || "",
    availability: merged.availability === "offline" ? "offline" : "online",
    riderStatus: merged.riderStatus || "",
    memberSince: memberSince(merged.createdAt),
  };

  const application: RiderApplication | null = asRiderApplication(applicationResponse);

  return <RiderProfileClient account={account} application={application} />;
}
