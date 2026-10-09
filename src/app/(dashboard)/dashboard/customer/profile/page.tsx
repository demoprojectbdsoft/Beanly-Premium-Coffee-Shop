import React from "react";
import CustomerProfileClient from "./CustomerProfileClient";
import { getUserSession } from "@/lib/core/session";
import { getUserById } from "@/lib/api/user";

export interface RealCustomerProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string;
  role: string;
  plan: string;
  status: string;
  member: "silver" | "gold" | "platinum" | "diamond" | string;
  points: number;
  phone: string;
  bio: string;
  memberSince: string;
}

const DEFAULT_PROFILE: RealCustomerProfile = {
  id: "",
  name: "Valued Customer",
  email: "customer@electro.com",
  emailVerified: true,
  image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  role: "customer",
  plan: "free",
  status: "active",
  member: "silver",
  points: 0,
  phone: "",
  bio: "",
  memberSince: "Recently",
};

async function getProfileData(): Promise<RealCustomerProfile> {
  try {
    const sessionUser = await getUserSession();
    if (!sessionUser) return DEFAULT_PROFILE;

    let dbUserData: any = null;
    try {
      if (sessionUser.id) {
        const res = await getUserById(sessionUser.id);
        if (res?.data) {
          dbUserData = res.data;
        }
      }
    } catch {
      // Backend fetch optional, fallback to session data
    }

    const merged = dbUserData || sessionUser;
    const createdAtDate = merged.createdAt ? new Date(merged.createdAt) : new Date();
    const formattedDate = !isNaN(createdAtDate.getTime())
      ? createdAtDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : "Recently";

    return {
      id: merged._id || merged.id || sessionUser.id || "",
      name: merged.name || sessionUser.name || "Customer",
      email: merged.email || sessionUser.email || "",
      emailVerified: Boolean(merged.emailVerified),
      image:
        merged.image ||
        merged.avatar ||
        sessionUser.image ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      role: merged.role || (sessionUser as any)?.role || "customer",
      plan: merged.plan || (sessionUser as any)?.plan || "free",
      status: merged.status || (sessionUser as any)?.status || "active",
      member: merged.member || (sessionUser as any)?.member || "silver",
      points: typeof merged.points === "number" ? merged.points : (sessionUser as any)?.points || 0,
      phone: merged.phone || (sessionUser as any)?.phone || "",
      bio: merged.bio || (sessionUser as any)?.bio || "",
      memberSince: formattedDate,
    };
  } catch (error) {
    console.error("Failed to fetch customer profile:", error);
    return DEFAULT_PROFILE;
  }
}

export default async function CustomerProfilePage() {
  const profileData = await getProfileData();
  return <CustomerProfileClient initialProfile={profileData} />;
}
