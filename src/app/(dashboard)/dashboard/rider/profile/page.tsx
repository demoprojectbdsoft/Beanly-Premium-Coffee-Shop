import React from "react";
import RiderProfileClient, { RiderProfile } from "./RiderProfileClient";
import { getRequiredRole } from "@/lib/core/session";
import { getUserById } from "@/lib/api/user";

export const dynamic = "force-dynamic";

/** The rider fields this page reads; the API returns the whole user document. */
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
  createdAt?: string | Date | null;
}

function memberSince(value?: string | Date | null): string {
  if (!value) return "Recently";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default async function RiderProfilePage() {
  const session = await getRequiredRole("rider");

  // The session carries the identity; the vehicle and availability fields are
  // added to the user document later, so the full record is read here.
  let record: RiderRecord | null = null;
  try {
    const res = await getUserById(session.id);
    record = (res?.data as RiderRecord) ?? null;
  } catch {
    // A failed read still leaves a usable form, filled from the session.
  }

  const merged: RiderRecord = record ?? {
    id: session.id,
    name: session.name,
    email: session.email,
  };

  const profile: RiderProfile = {
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
    memberSince: memberSince(merged.createdAt),
  };

  return <RiderProfileClient initialProfile={profile} />;
}
