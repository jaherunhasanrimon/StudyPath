'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 text-center shadow-xl space-y-4">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-xl font-bold text-slate-100">একটি অপ্রত্যাশিত ত্রুটি ঘটেছে</h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          Something went wrong while rendering this page. You can try refreshing or return to your study routine.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            onClick={() => reset()}
            className="flex-1 min-h-[44px] bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs rounded-lg px-4 py-2.5 transition"
          >
            আবার চেষ্টা করুন (Retry)
          </button>
          <Link
            href="/"
            className="flex-1 min-h-[44px] bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-xs rounded-lg px-4 py-2.5 border border-slate-600 transition flex items-center justify-center"
          >
            হোমে যান (Home)
          </Link>
        </div>
      </div>
    </div>
  );
}
