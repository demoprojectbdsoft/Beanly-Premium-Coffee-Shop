"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button, Card, Chip } from "@heroui/react";
import {
  Bike,
  BadgeCheck,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "react-toastify";
import ImageUploader from "@/components/shared/ImageUploader";
import { updateUser } from "@/lib/action/user";
import { authClient } from "@/lib/auth-client";

export interface RiderProfile {
  id: string;
  name: string;
  email: string;
  image: string;
  phone: string;
  bio: string;
  vehicleType: string;
  vehicleNumber: string;
  licenseNumber: string;
  availability: "online" | "offline";
  memberSince: string;
}

const VEHICLE_TYPES = ["Bicycle", "Motorbike", "Scooter", "Car", "Van", "Truck"];

const inputClass =
  "w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-xs text-[var(--foreground)] outline-none focus:border-[var(--brand-flat)] transition-colors";

export default function RiderProfileClient({ initialProfile }: { initialProfile: RiderProfile }) {
  const router = useRouter();
  // The sidebar badge and the account chip read availability from the
  // better-auth session. A save writes through the store API, which
  // better-auth knows nothing about, so the client session is refetched
  // afterwards. `disableCookieCache` forces the server to re-read the user
  // document instead of answering from its cached session cookie.
  const { refetch } = authClient.useSession();

  const [name, setName] = useState(initialProfile.name);
  // The photo is saved with the rest of the details, so the card on the left
  // shows the new face the moment it is uploaded.
  const [image, setImage] = useState(initialProfile.image);
  const [phone, setPhone] = useState(initialProfile.phone);
  const [bio, setBio] = useState(initialProfile.bio);
  const [vehicleType, setVehicleType] = useState(initialProfile.vehicleType);
  const [vehicleNumber, setVehicleNumber] = useState(initialProfile.vehicleNumber);
  const [licenseNumber, setLicenseNumber] = useState(initialProfile.licenseNumber);
  const [availability, setAvailability] = useState(initialProfile.availability);

  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const initials = (name.trim() || "Rider")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateUser(initialProfile.id, {
        name: name.trim(),
        image: image.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        vehicleType: vehicleType.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        licenseNumber: licenseNumber.trim().toUpperCase(),
      });

      if (res?.success === false) {
        toast.error(res?.message || "Could not save your profile.");
        return;
      }

      toast.success("Profile updated successfully!");
      router.refresh();
      refetch({ query: { disableCookieCache: true } });
    } catch {
      toast.error("Could not save your profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvailability = async (next: "online" | "offline") => {
    if (next === availability || isToggling) return;

    const previous = availability;
    setAvailability(next);
    setIsToggling(true);

    try {
      const res = await updateUser(initialProfile.id, { availability: next });
      if (res?.success === false) {
        setAvailability(previous);
        toast.error(res?.message || "Could not change your availability.");
        return;
      }

      toast.success(next === "online" ? "You are online — new jobs can reach you." : "You are offline.");
      router.refresh();
      refetch({ query: { disableCookieCache: true } });
    } catch {
      setAvailability(previous);
      toast.error("Could not change your availability.");
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Rider <span className="text-gradient-primary">Profile</span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Your details, vehicle and availability — the store uses these when assigning jobs.
          </p>
        </div>

        <Chip
          size="sm"
          className={`border text-[11px] font-bold ${
            availability === "online"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
          }`}
        >
          {availability === "online" ? "Online" : "Offline"}
        </Chip>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Identity card ── */}
        <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-5 h-fit">
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 shrink-0 rounded-2xl bg-brand-gradient text-[var(--on-grad-text)] flex items-center justify-center text-lg font-black shadow-xs overflow-hidden">
              {image ? (
                <Image
                  src={image}
                  alt={name || "Rider"}
                  fill
                  sizes="56px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                initials || <User className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--foreground)] truncate">
                {name || "Rider"}
              </p>
              <p className="text-[11px] text-[var(--foreground-muted)] truncate">
                {initialProfile.email}
              </p>
            </div>
          </div>

          <div className="space-y-2.5 text-[11px]">
            <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
              <Mail className="w-3.5 h-3.5" />
              <span className="truncate">{initialProfile.email || "No email"}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
              <Phone className="w-3.5 h-3.5" />
              <span>{phone || "No phone yet"}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
              <Bike className="w-3.5 h-3.5" />
              <span>
                {vehicleType || "No vehicle yet"}
                {vehicleNumber && ` · ${vehicleNumber}`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
              <BadgeCheck className="w-3.5 h-3.5" />
              <span>Rider since {initialProfile.memberSince}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-color)] space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              Availability
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAvailability("online")}
                disabled={isToggling}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                  availability === "online"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-[var(--surface-alt)] text-[var(--foreground-muted)] border-[var(--border-color)]"
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                Online
              </button>
              <button
                type="button"
                onClick={() => handleAvailability("offline")}
                disabled={isToggling}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                  availability === "offline"
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                    : "bg-[var(--surface-alt)] text-[var(--foreground-muted)] border-[var(--border-color)]"
                }`}
              >
                <WifiOff className="w-3.5 h-3.5" />
                Offline
              </button>
            </div>
            <p className="text-[10px] text-[var(--foreground-muted)] leading-relaxed">
              Going offline stops new requests. Jobs you already accepted stay yours until they are
              delivered.
            </p>
          </div>
        </Card>

        {/* ── Editable details ── */}
        <Card className="lg:col-span-2 bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs">
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">Personal details</h3>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                Customers see your name, photo and phone while you are carrying their parcel.
              </p>
            </div>

            <ImageUploader
              label="Profile photo"
              value={image}
              onChange={setImage}
              urlPlaceholder="https://images.unsplash.com/..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--foreground)]">Full name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--foreground)]">Phone</label>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+880 1XXX XXXXXX"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--foreground)]">Short bio</label>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={3}
                placeholder="Experience, area you cover, working hours..."
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="pt-4 border-t border-[var(--border-color)] space-y-4">
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">Vehicle & licence</h3>
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                  Kept on your record so the store knows what to expect at the door.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--foreground)]">Vehicle</label>
                  <select
                    value={vehicleType}
                    onChange={(event) => setVehicleType(event.target.value)}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="">Select vehicle</option>
                    {VEHICLE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--foreground)]">
                    Vehicle number
                  </label>
                  <input
                    value={vehicleNumber}
                    onChange={(event) => setVehicleNumber(event.target.value)}
                    placeholder="DHA-GA-11-2233"
                    className={`${inputClass} uppercase`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--foreground)]">
                    Licence number
                  </label>
                  <input
                    value={licenseNumber}
                    onChange={(event) => setLicenseNumber(event.target.value)}
                    placeholder="DL-XXXXXXXX"
                    className={`${inputClass} uppercase`}
                  />
                </div>
              </div>

              <p className="flex items-center gap-1.5 text-[10px] text-[var(--foreground-muted)]">
                <ShieldCheck className="w-3.5 h-3.5" />
                The store verifies these documents before your first pickup.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="submit"
                isDisabled={isSaving}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold h-10 px-5 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Save changes"}</span>
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
