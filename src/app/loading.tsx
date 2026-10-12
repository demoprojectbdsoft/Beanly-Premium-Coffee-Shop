"use client";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 h-screen w-screen flex flex-col items-center justify-center px-4 overflow-hidden bg-gradient-to-b from-sky-50/40 via-white to-slate-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      
      {/* ── Ambient Background Glow ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-112.5 h-112.5 bg-gradient-to-tr from-sky-400/20 to-blue-600/20 dark:from-sky-500/10 dark:to-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* ── Main Loading Container ── */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-6">
        
        {/* 1. Concentric Spinner Assembly */}
        <div className="relative flex items-center justify-center">
          {/* Outer Ping Aura */}
          <div className="absolute w-20 h-20 rounded-full border-2 border-sky-400/30 dark:border-sky-500/20 animate-ping opacity-75" />

          {/* Gradient Rotating Ring */}
          <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-sky-500 border-r-blue-600 dark:border-t-sky-400 dark:border-r-blue-500 animate-spin" />

          {/* Inner Core */}
          <div className="absolute w-8 h-8 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 shadow-lg shadow-sky-500/40 animate-pulse" />
        </div>

        {/* 2. Text Indicator */}
        <div className="text-center space-y-1.5">
          <h3 className="text-base md:text-lg font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 dark:from-sky-400 dark:via-blue-400 dark:to-indigo-400 uppercase animate-pulse">
            Loading Sparq
          </h3>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 tracking-wider">
            Preparing your experience...
          </p>
        </div>

        {/* 3. Progress Shimmer Line */}
        <div className="w-48 h-1.5 bg-sky-100 dark:bg-gray-800 rounded-full overflow-hidden relative shadow-inner">
          <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full animate-[shimmer_1.8s_infinite] -translate-x-full" />
        </div>

      </div>

      {/* Global Inline Keyframe for Smooth 60fps Shimmer */}
      <style jsx global>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}