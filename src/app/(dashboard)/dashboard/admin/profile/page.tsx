import React from "react";
import AdminProfileClient, { AdminProfileData } from "./AdminProfileClient";
import { getUserSession } from "@/lib/core/session";
import { getUserById } from "@/lib/api/user";

const INITIAL_ADMIN_PROFILE: AdminProfileData = {
  id: "admin-user",
  name: "System Administrator",
  firstName: "System",
  lastName: "Administrator",
  email: "admin@sparq.com",
  phone: "",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  role: "Administrator",
  department: "Management & Operations",
  bio: "",
  joinedDate: "Recently",
  warehouse: { label: "", address: "", city: "", area: "", postalCode: "", phone: "" },
};

async function getAdminProfileData(): Promise<AdminProfileData> {
  try {
    const session = await getUserSession();
    if (!session) return INITIAL_ADMIN_PROFILE;

    let dbUser: any = null;
    if (session.id) {
      try {
        const res = await getUserById(session.id);
        if (res?.data) {
          dbUser = res.data;
        }
      } catch {
        // Fallback to session
      }
    }

    const merged = dbUser || session;
    const name = merged.name || session.name || "Administrator";
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || "System";
    const lastName = nameParts.slice(1).join(" ") || "";

    const rawDate = merged.createdAt || (session as any).createdAt;
    let joinedDate = "Recently";
    if (rawDate) {
      const parsedDate = new Date(rawDate);
      if (!isNaN(parsedDate.getTime())) {
        joinedDate = parsedDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      }
    }

    return {
      id: merged._id || merged.id || session.id || INITIAL_ADMIN_PROFILE.id,
      name,
      firstName,
      lastName,
      email: merged.email || session.email || INITIAL_ADMIN_PROFILE.email,
      phone: merged.phone || (session as any).phone || "",
      avatar:
        merged.image ||
        merged.avatar ||
        session.image ||
        INITIAL_ADMIN_PROFILE.avatar,
      role: merged.role || (session as any).role || "admin",
      department: merged.department || (session as any).department || "Management & Operations",
      bio: merged.bio || (session as any).bio || "",
      joinedDate,
      // The hand-over desk is read back so the form shows what the riders get;
      // a missing record is an empty form, never a missing section.
      warehouse: {
        label: merged.warehouse?.label || "",
        address: merged.warehouse?.address || "",
        city: merged.warehouse?.city || "",
        area: merged.warehouse?.area || "",
        postalCode: merged.warehouse?.postalCode || "",
        phone: merged.warehouse?.phone || "",
      },
    };
  } catch (error) {
    console.error("Failed to fetch admin profile:", error);
    return INITIAL_ADMIN_PROFILE;
  }
}

export default async function AdminProfilePage() {
  const profileData = await getAdminProfileData();
  return <AdminProfileClient initialProfile={profileData} />;
}
