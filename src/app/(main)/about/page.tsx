import React from "react";
import Link from "next/link";
import { ShieldCheck, Truck, Headphones, Award, Users, ArrowRight } from "lucide-react";

export const metadata = {
  title: "About Us - Electro",
  description: "Learn more about Electro, our mission, vision, and commitment to quality electronics.",
};

const FEATURES = [
  {
    icon: Truck,
    title: "Fast Delivery",
    desc: "Free shipping on all orders over $50 with guaranteed timely delivery.",
  },
  {
    icon: ShieldCheck,
    title: "100% Secure Payments",
    desc: "We ensure secure payment with verified SSL encryption and fraud protection.",
  },
  {
    icon: Headphones,
    title: "24/7 Dedicated Support",
    desc: "Our friendly support team is always available to help with your inquiries.",
  },
  {
    icon: Award,
    title: "Quality Guarantee",
    desc: "All products are backed by authentic manufacturer warranties and quality assurance.",
  },
];

export default function AboutPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100 font-semibold">About Us</span>
      </nav>

      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 px-3 py-1.5 rounded-full">
          About Sparq
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          We Provide High Quality Electronics & Tech Gadgets
        </h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
          Welcome to Sparq, your number one destination for premium consumer electronics, smart gadgets, computers, audio equipment, and tech accessories. We are dedicated to giving you the best online shopping experience.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
        {FEATURES.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow space-y-3"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {item.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* CTA Box */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-blue-700 text-white p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-bold">Ready to explore our latest arrivals?</h2>
          <p className="text-xs md:text-sm text-blue-100 max-w-xl">
            Browse our wide selection of consumer tech, laptops, smartphones, and gaming consoles today.
          </p>
        </div>
        <Link
          href="/shop"
          className="px-6 py-3.5 rounded-full bg-white text-primary font-bold text-xs md:text-sm hover:bg-gray-100 transition-colors shrink-0 flex items-center gap-2"
        >
          <span>Shop Now</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
