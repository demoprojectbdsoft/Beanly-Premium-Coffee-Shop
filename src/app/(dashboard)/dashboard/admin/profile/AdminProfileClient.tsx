"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, Button, Input } from "@heroui/react";
import {
  User,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  Save,
  Building2,
  BadgeCheck,
  Activity,
} from "lucide-react";
import { toast } from "react-toastify";
import { authClient } from "@/lib/auth-client";
import { updateUser } from "@/lib/action/user";
import ImageUploader from "@/components/shared/ImageUploader";
import { useDemoAdmin } from "@/hooks/useDemoAdmin";

export interface AdminProfileData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  role: string;
  department: string;
  bio: string;
  joinedDate: string;
}

interface AdminProfileClientProps {
  initialProfile: AdminProfileData;
}

export default function AdminProfileClient({
  initialProfile,
}: AdminProfileClientProps) {
  const { guardDemo } = useDemoAdmin();
  const [profile, setProfile] = useState<AdminProfileData>(initialProfile);
  const [avatarUrl, setAvatarUrl] = useState<string>(initialProfile.avatar || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardDemo()) return;
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      toast.error("First name and last name are required.");
      return;
    }
    setIsSaving(true);
    try {
      const fullName = `${profile.firstName} ${profile.lastName}`.trim();
      await updateUser(profile.id, {
        name: fullName,
        image: avatarUrl || undefined,
        phone: profile.phone,
        bio: profile.bio,
        department: profile.department,
      });
      setProfile((prev) => ({
        ...prev,
        name: fullName,
        avatar: avatarUrl || prev.avatar,
      }));
      toast.success("Profile updated successfully!");
    } catch {
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
          <Link href="/dashboard/admin" className="hover:text-sky-600 transition-colors">
            Admin Dashboard
          </Link>
          <span>/</span>
          <span className="text-sky-600 dark:text-sky-400">Profile</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Admin{" "}
          <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
            Profile
          </span>
        </h1>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your administrator account details, profile avatar, and personal information.
        </p>
      </div>

      {/* ── Profile Header Card ── */}
      <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-sky-500 to-blue-600 p-1 shadow-md overflow-hidden">
              <Image
                src={avatarUrl || profile.avatar}
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
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                Administrator
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/40">
                <BadgeCheck className="w-3.5 h-3.5" />
                Full Access
              </span>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-lg">
              {profile.bio || "No bio set yet."}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                {profile.email}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                {profile.department}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                Joined {profile.joinedDate}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Main Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Details Form */}
        <Card className="lg:col-span-2 bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Personal Information
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Update your name, avatar, contact details, and brief bio.
            </p>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4 text-xs">
            {/* Image Uploader with both File Upload & URL input */}
            <div className="space-y-1">
              <ImageUploader
                label="Profile Picture / Avatar"
                value={avatarUrl}
                onChange={setAvatarUrl}
                urlPlaceholder="https://images.unsplash.com/..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  First Name
                </label>
                <Input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) =>
                    setProfile({ ...profile, firstName: e.target.value })
                  }
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 focus:border-sky-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Last Name
                </label>
                <Input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) =>
                    setProfile({ ...profile, lastName: e.target.value })
                  }
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 focus:border-sky-500 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 focus:border-sky-500 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700 dark:text-gray-300">
                Department
              </label>
              <Input
                type="text"
                value={profile.department}
                onChange={(e) =>
                  setProfile({ ...profile, department: e.target.value })
                }
                placeholder="e.g. Operations, Catalog, Finance"
                className="w-full h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 focus:border-sky-500 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700 dark:text-gray-300">
                Short Bio / Notes
              </label>
              <textarea
                rows={3}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
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

        {/* Admin Access Overview Card */}
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Account Overview
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your role, permissions, and access status.
            </p>
          </div>

          <div className="space-y-3">
            {/* Role */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-gray-950/60 border border-slate-100 dark:border-gray-800">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <User className="w-3.5 h-3.5 text-sky-500" />
                <span className="font-semibold">Role</span>
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-white capitalize">
                {profile.role}
              </span>
            </div>

            {/* Department */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-gray-950/60 border border-slate-100 dark:border-gray-800">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Building2 className="w-3.5 h-3.5 text-sky-500" />
                <span className="font-semibold">Department</span>
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                {profile.department}
              </span>
            </div>

            {/* Phone */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-gray-950/60 border border-slate-100 dark:border-gray-800">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Phone className="w-3.5 h-3.5 text-sky-500" />
                <span className="font-semibold">Phone</span>
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                {profile.phone || "—"}
              </span>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-gray-950/60 border border-slate-100 dark:border-gray-800">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Activity className="w-3.5 h-3.5 text-sky-500" />
                <span className="font-semibold">Status</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Active
              </span>
            </div>

            {/* Joined */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-gray-950/60 border border-slate-100 dark:border-gray-800">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Calendar className="w-3.5 h-3.5 text-sky-500" />
                <span className="font-semibold">Joined</span>
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                {profile.joinedDate}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-gray-800">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center leading-relaxed">
              To change your email or password, go to{" "}
              <Link
                href="/dashboard/admin/settings"
                className="text-sky-500 hover:underline font-semibold"
              >
                Settings → Security
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
