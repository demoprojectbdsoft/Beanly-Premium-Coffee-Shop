"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, Button, Input } from "@heroui/react";
import {
  User,
  Mail,
  Calendar,
  ShieldCheck,
  Save,
  Coins,
  Crown,
  Phone,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";
import { authClient } from "@/lib/auth-client";
import { updateUser } from "@/lib/action/user";
import ImageUploader from "@/components/shared/ImageUploader";
import { RealCustomerProfile } from "./page";

interface CustomerProfileClientProps {
  initialProfile: RealCustomerProfile;
}

export default function CustomerProfileClient({
  initialProfile,
}: CustomerProfileClientProps) {
  const [profile, setProfile] = useState<RealCustomerProfile>(initialProfile);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [name, setName] = useState(initialProfile.name || "");
  const [imageUrl, setImageUrl] = useState(initialProfile.image || "");
  const [phone, setPhone] = useState(initialProfile.phone || "");
  const [bio, setBio] = useState(initialProfile.bio || "");
  const [isSaving, setIsSaving] = useState(false);

  const { data: session } = authClient.useSession();
  const sessionUser = session?.user as { id?: string } | undefined;

  // Fetch live DB data on mount to get up-to-date member/points
  useEffect(() => {
    const userId = profile.id || sessionUser?.id;
    if (!userId) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return;

    fetch(`${apiUrl}/users/${userId}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const data = json?.data ?? json;
        if (data) {
          setProfile((prev) => ({
            ...prev,
            member: data.member ?? prev.member,
            points: typeof data.points === "number" ? data.points : prev.points,
            status: data.status ?? prev.status,
            plan: data.plan ?? prev.plan,
            role: data.role ?? prev.role,
          }));
        }
      })
      .catch(() => {
        // Silently fallback to initial server-rendered data
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, sessionUser?.id]);

  const memberTierName =
    profile.member.charAt(0).toUpperCase() + profile.member.slice(1);

  const getTierColors = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "diamond":
        return {
          bg: "bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300",
          badge: "bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white",
          iconColor: "text-cyan-500",
        };
      case "platinum":
        return {
          bg: "bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300",
          badge: "bg-gradient-to-r from-purple-500 to-indigo-600 text-white",
          iconColor: "text-purple-500",
        };
      case "gold":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
          badge: "bg-gradient-to-r from-amber-500 to-yellow-600 text-white",
          iconColor: "text-amber-500",
        };
      default: // silver
        return {
          bg: "bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300",
          badge: "bg-gradient-to-r from-slate-500 to-gray-600 text-white",
          iconColor: "text-slate-400",
        };
    }
  };

  const tierColors = getTierColors(profile.member);

  // Manual refresh of live data
  const handleRefreshLiveData = async () => {
    const userId = profile.id || sessionUser?.id;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!userId || !apiUrl) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`${apiUrl}/users/${userId}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const data = json?.data ?? json;
        if (data) {
          setProfile((prev) => ({
            ...prev,
            member: data.member ?? prev.member,
            points: typeof data.points === "number" ? data.points : prev.points,
            status: data.status ?? prev.status,
            plan: data.plan ?? prev.plan,
            role: data.role ?? prev.role,
          }));
          toast.success("Profile data refreshed!");
        }
      }
    } catch {
      toast.error("Failed to refresh live data.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      if (profile.id) {
        await updateUser(profile.id, {
          name: name.trim(),
          image: imageUrl.trim() || undefined,
          phone: phone.trim(),
          bio: bio.trim(),
        });
      }
      setProfile((prev) => ({
        ...prev,
        name: name.trim(),
        image: imageUrl.trim() || prev.image,
        phone: phone.trim(),
        bio: bio.trim(),
      }));
      toast.success("Profile updated successfully!");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
          <Link href="/dashboard/customer" className="hover:text-sky-600 transition-colors">
            Customer Dashboard
          </Link>
          <span>/</span>
          <span className="text-sky-600 dark:text-sky-400">Profile</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          My Account{" "}
          <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
            Profile
          </span>
        </h1>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
          View and manage your personal details, bio, contact number, and membership perks.
        </p>
      </div>

      {/* ── Profile Header Card ── */}
      <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-sky-500 to-blue-600 p-1 shadow-md overflow-hidden">
              <Image
                src={imageUrl || profile.image}
                alt={profile.name}
                fill
                sizes="96px"
                className="object-cover rounded-[22px]"
                unoptimized
              />
            </div>
          </div>

          {/* User Meta */}
          <div className="space-y-2 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {profile.name}
              </h2>

              {/* Account Status Badge */}
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                {profile.status === "active" ? "Active Customer" : "Account Suspended"}
              </span>

              {/* Member Tier Badge — live data */}
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${tierColors.badge}`}>
                <Crown className="w-3.5 h-3.5" />
                {memberTierName} Tier
              </span>
            </div>

            {profile.bio && (
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-lg">
                {profile.bio}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                {profile.email}
              </span>
              {profile.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {profile.phone}
                </span>
              )}
              {/* Live Points */}
              <span className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  {profile.points.toLocaleString()}
                </span>{" "}
                Points
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                Member since {profile.memberSince}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Details Form */}
        <Card className="lg:col-span-2 bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Personal Information
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Update your display name, contact phone, avatar, and personal bio.
            </p>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4 text-xs">
            {/* Image Uploader supporting both Upload File & Direct URL */}
            <div className="space-y-1">
              <ImageUploader
                label="Profile Avatar Picture"
                value={imageUrl}
                onChange={setImageUrl}
                urlPlaceholder="https://images.unsplash.com/..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Full Name
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 focus:border-sky-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 focus:border-sky-500 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <Input
                type="email"
                value={profile.email}
                disabled
                className="w-full h-10 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-800/60 text-gray-500 cursor-not-allowed text-xs"
              />
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                Email address is linked to your authentication login.
              </p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700 dark:text-gray-300">
                Personal Bio / About Me
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us a little bit about yourself..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 focus:border-sky-500 focus:outline-none text-xs"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                isDisabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold transition-all shadow-xs cursor-pointer h-10 flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card>

        {/* Membership & Rewards Summary Card */}
        <div className="space-y-6">
          <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Membership &amp; Perks
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Your live tier benefits and loyalty balance
                </p>
              </div>
              {/* Refresh live data button */}
              <button
                type="button"
                onClick={handleRefreshLiveData}
                disabled={isRefreshing}
                title="Refresh live membership data"
                className="p-1.5 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Current Tier Box — live data */}
            <div className={`p-4 rounded-xl border ${tierColors.bg} space-y-2`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className={`w-4 h-4 ${tierColors.iconColor}`} />
                  <span className="text-xs font-bold capitalize">
                    {memberTierName} Tier
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/70 dark:bg-black/40">
                  {profile.plan} Plan
                </span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-400">
                Earn reward points on every order to redeem instant store discounts.
              </p>
            </div>

            {/* Reward Points Box — live data */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    Electro Reward Points
                  </span>
                </div>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                  {profile.points.toLocaleString()} pts
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Equivalent to{" "}
                <span className="font-bold text-gray-900 dark:text-white">
                  ${(profile.points * 0.01).toFixed(2)} USD
                </span>{" "}
                in store credit.
              </p>

              {/* Next tier progress hint */}
              {profile.member?.toLowerCase() !== "diamond" && (
                <div className="pt-1 text-[10px] text-gray-400 dark:text-gray-500">
                  {profile.member?.toLowerCase() === "silver" && (
                    <span>🥇 <strong>{(1000 - profile.points).toLocaleString()}</strong> pts to Gold</span>
                  )}
                  {profile.member?.toLowerCase() === "gold" && (
                    <span>🟣 <strong>{(4000 - profile.points).toLocaleString()}</strong> pts to Platinum</span>
                  )}
                  {profile.member?.toLowerCase() === "platinum" && (
                    <span>💎 <strong>{(10000 - profile.points).toLocaleString()}</strong> pts to Diamond</span>
                  )}
                </div>
              )}
              {profile.member?.toLowerCase() === "diamond" && (
                <p className="pt-1 text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                  💎 You have reached the highest Diamond tier!
                </p>
              )}
            </div>

            {/* Account Status */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-gray-800 text-xs">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span>Account Status</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">
                  {profile.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span>Account Role</span>
                <span className="font-semibold text-gray-900 dark:text-white capitalize">
                  {profile.role}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span>Email Verified</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {profile.emailVerified ? "Yes" : "Pending"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
