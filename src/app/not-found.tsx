import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 text-center shadow-xl space-y-4">
        <div className="text-4xl">🔍</div>
        <h1 className="text-xl font-bold text-slate-100">পৃষ্ঠাটি খুঁজে পাওয়া যায়নি</h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs rounded-lg px-6 py-2.5 transition"
          >
            হোমপেজে ফিরে যান (Return Home)
          </Link>
        </div>
      </div>
    </div>
  );
}
