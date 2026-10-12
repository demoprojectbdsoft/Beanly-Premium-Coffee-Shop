import React from 'react';
import Link from 'next/link';
import { MapPin, Truck, Sparkles } from 'lucide-react';
import { TopBarItem } from '@/types';
import LanguageTranslator from './LanguageTranslator';

// Top Bar Specific Data Array
export const TOP_BAR_ITEMS: TopBarItem[] = [
  { label: 'Store Locator', href: '/store-locator', icon: MapPin },
  { label: 'Track Order', href: '/track-order', icon: Truck },
];

export default function TopBar() {
  return (
    <div className="relative w-full bg-gradient-to-r from-blue-700 via-sky-600 to-indigo-700 dark:from-[#0b0f19] dark:via-[#131d2e] dark:to-[#0b0f19] text-white dark:text-gray-200 text-xs transition-colors duration-200 shadow-xs">
      {/* Bottom accent gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-sky-400 via-indigo-300 to-amber-300 dark:from-sky-500 dark:via-blue-600 dark:to-indigo-500 opacity-80 pointer-events-none" />

      <div className="w-full px-3 sm:px-6 md:px-14 py-1.5 sm:py-2 flex flex-col sm:flex-row justify-between items-center gap-1.5 sm:gap-4">
        {/* Left Side: Welcome & Announcement Badge */}
        <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 text-center sm:text-left min-w-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 dark:bg-sky-500/20 text-white dark:text-sky-300 text-[10px] sm:text-[11px] font-bold backdrop-blur-xs border border-white/20 dark:border-sky-400/30 shadow-2xs whitespace-nowrap shrink-0">
            <Sparkles className="w-3 h-3 text-amber-300 animate-pulse shrink-0" />
            <span>Deals</span>
          </span>
          <p className="font-medium text-white/95 dark:text-gray-300 text-[11px] sm:text-xs tracking-tight sm:tracking-wide truncate sm:whitespace-normal">
            <span className="hidden md:inline">Welcome to Worldwide Electronics Store • </span>
            <span className="font-semibold">Free Express Shipping on $50+</span>
          </p>
        </div>

        {/* Right Side: Links & Language Switcher */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 shrink-0">
          {TOP_BAR_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <React.Fragment key={item.label}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-white/90 dark:text-gray-300 hover:text-white dark:hover:text-white hover:bg-white/15 dark:hover:bg-white/10 transition-all duration-200 text-[10px] sm:text-xs font-semibold whitespace-nowrap"
                >
                  <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-200 dark:text-sky-400 group-hover:text-amber-300 transition-colors shrink-0" />
                  <span>{item.label}</span>
                </Link>

                <span className="text-white/30 dark:text-gray-700 text-[10px] sm:text-xs select-none">|</span>
              </React.Fragment>
            );
          })}

          <LanguageTranslator variant="topbar" />
        </div>
      </div>
    </div>
  );
}