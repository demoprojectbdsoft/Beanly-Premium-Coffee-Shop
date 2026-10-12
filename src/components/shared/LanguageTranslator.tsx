"use client";

import React, { useEffect, useRef, useState } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇧🇩" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "zh-CN", name: "Chinese", nativeName: "简体中文", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
];

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

interface LanguageTranslatorProps {
  variant?: "topbar" | "inline";
}

export default function LanguageTranslator({
  variant = "topbar",
}: LanguageTranslatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<string>("en");
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize and read saved language on client mount
  useEffect(() => {
    // 1. Detect current language from cookies or localStorage
    const saved = localStorage.getItem("electro_user_lang");
    if (saved) {
      setCurrentLang(saved);
    } else {
      const match = document.cookie.match(/googtrans=\/en\/([a-zA-Z-]+)/);
      if (match && match[1]) {
        setCurrentLang(match[1]);
      }
    }

    // 2. Inject Google Translate script if not already in document
    const scriptId = "google-translate-script";
    if (!document.getElementById(scriptId)) {
      window.googleTranslateElementInit = () => {
        try {
          if (window.google?.translate?.TranslateElement) {
            new window.google.translate.TranslateElement(
              {
                pageLanguage: "en",
                autoDisplay: false,
              },
              "google_translate_element"
            );
          }
        } catch (err) {
          console.warn("Google Translate initialization notice:", err);
        }
      };

      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectLanguage = (code: string) => {
    setCurrentLang(code);
    setIsOpen(false);
    localStorage.setItem("electro_user_lang", code);

    // Set cookie for Google Translate (both session & persistence across pages)
    const cookieVal = code === "en" ? "/en/en" : `/en/${code}`;
    const hostname = window.location.hostname;

    document.cookie = `googtrans=${cookieVal}; path=/;`;
    if (hostname !== "localhost") {
      document.cookie = `googtrans=${cookieVal}; domain=${hostname}; path=/;`;
      document.cookie = `googtrans=${cookieVal}; domain=.${hostname}; path=/;`;
    }

    // Attempt to dynamically trigger Google Translate without full page reload
    const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (select) {
      select.value = code;
      select.dispatchEvent(new Event("change"));
    } else {
      // If the translate element hasn't finished initial DOM binding, reload to apply cookie
      window.location.reload();
    }
  };

  const activeLanguage =
    SUPPORTED_LANGUAGES.find((lang) => lang.code === currentLang) ||
    SUPPORTED_LANGUAGES[0];

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Inline Variant (Used in Mobile Drawers & Menus) ────────────────────────
  if (variant === "inline") {
    return (
      <div className="w-full space-y-2">
        {/* Hidden anchor for Google Translate element */}
        <div id="google_translate_element" className="hidden" aria-hidden="true" />

        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900/70 border border-gray-200/80 dark:border-gray-800/80">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Language
            </span>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-200 shadow-2xs hover:border-primary transition-all cursor-pointer"
            >
              <span className="text-sm leading-none">{activeLanguage.flag}</span>
              <span>{activeLanguage.name}</span>
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </button>

            {isOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-56 max-h-64 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-1.5 z-50">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                      currentLang === lang.code
                        ? "bg-primary text-white font-bold"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{lang.flag}</span>
                      <span className="font-medium">{lang.name}</span>
                      <span className="text-[10px] opacity-75">
                        ({lang.nativeName})
                      </span>
                    </div>
                    {currentLang === lang.code && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── TopBar Variant (Used in Header Top Bar on Desktop & Tablets) ────────────
  return (
    <div className="relative notranslate" ref={dropdownRef}>
      {/* Hidden container for Google Translate JS binding */}
      <div id="google_translate_element" className="hidden" aria-hidden="true" />

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change language"
        className="group flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-white/90 dark:text-gray-300 hover:text-white dark:hover:text-white hover:bg-white/15 dark:hover:bg-white/10 transition-all duration-200 text-[10px] sm:text-xs font-semibold whitespace-nowrap cursor-pointer select-none"
      >
        <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-200 dark:text-sky-400 group-hover:text-amber-300 transition-colors shrink-0" />
        <span className="text-xs sm:text-sm leading-none shrink-0">
          {activeLanguage.flag}
        </span>
        <span className="hidden md:inline font-medium">{activeLanguage.name}</span>
        <ChevronDown
          className={`w-3 h-3 text-white/70 group-hover:text-white transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-60 max-h-80 overflow-hidden flex flex-col rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header & Quick Search */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xs">
            <input
              type="text"
              placeholder="Search language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
          </div>

          {/* Languages List */}
          <div className="overflow-y-auto p-1.5 space-y-0.5 divide-y divide-gray-100/40 dark:divide-gray-800/40">
            {filteredLanguages.length === 0 ? (
              <p className="p-3 text-center text-xs text-gray-400">
                No languages found
              </p>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected = currentLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-white font-bold shadow-xs"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-left min-w-0">
                      <span className="text-base shrink-0">{lang.flag}</span>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate leading-tight font-medium">
                          {lang.name}
                        </span>
                        <span
                          className={`text-[10px] leading-tight truncate ${
                            isSelected
                              ? "text-white/80"
                              : "text-gray-400 dark:text-gray-500"
                          }`}
                        >
                          {lang.nativeName}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 shrink-0 text-white" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
