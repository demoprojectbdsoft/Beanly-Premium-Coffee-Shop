import React, { Suspense } from "react";
import { RegisterForm } from "./RegisterForm";

export const metadata = {
  title: "Register | Admin Dashboard",
  description: "Create a new admin account to access the control panel.",
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-gray-950" />}>
      <RegisterForm />
    </Suspense>
  );
}