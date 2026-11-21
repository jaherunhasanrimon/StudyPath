'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function TermsPage() {
  const [lang, setLang] = useState<'bn' | 'en'>('bn');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-slate-800 border border-slate-700 rounded-xl p-6 sm:p-10 shadow-xl">
        <div className="flex items-center justify-between pb-6 border-b border-slate-700">
          <div>
            <Link href="/" className="text-xl font-bold text-teal-400 hover:text-teal-300 transition">
              ← দিশারি (Dishari)
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100 mt-2">
              {lang === 'bn' ? 'ব্যবহারের শর্তাবলী' : 'Terms of Service'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'bn'
                ? 'সর্বশেষ হালনাগাদ: নভেম্বর ২০২৬ • শিক্ষার্থী ও অভিভাবকদের জন্য সহজ নির্দেশিকা'
                : 'Last updated: November 2026 • Plain-language terms for students & guardians'}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setLang('bn')}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
                lang === 'bn' ? 'bg-teal-700 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              বাংলা
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
                lang === 'en' ? 'bg-teal-700 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {lang === 'bn' ? (
          <div className="mt-8 space-y-6 text-sm text-slate-300 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">১. শর্তাবলীর গ্রহণযোগ্যতা</h2>
              <p>
                দিশারি ওয়েবসাইট বা অ্যাপ্লিকেশন ব্যবহারের মাধ্যমে আপনি এই ব্যবহারের শর্তাবলী এবং ইউটিউবের অফিশিয়াল{' '}
                <a
                  href="https://www.youtube.com/t/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-400 underline"
                >
                  YouTube Terms of Service
                </a>{' '}
                মেনে নিতে সম্মত হচ্ছেন।
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">২. সেবার প্রকৃতি</h2>
              <p>
                দিশারি একটি শিক্ষামূলক সহায়ক প্ল্যাটফর্ম যা উন্মুক্ত ইউটিউব প্লেলিস্টগুলোর ওপর ভিত্তি করে স্বয়ংক্রিয় রুটিন (পাথওয়ে) তৈরি করে দেয়। দিশারি কোনো শিক্ষাপ্রতিষ্ঠান বা ইউটিউব ভিডিও নির্মাতার প্রতিনিধিত্ব করে না।
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">৩. বুদ্ধিবৃত্তিক সম্পদ ও ইউটিউব কন্টেন্ট</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>ইউটিউব ভিডিও, থাম্বনেইল এবং সংশ্লিষ্ট কন্টেন্টের স্বত্বাধিকারী সম্পূর্ণভাবে মূল কনটেন্ট ক্রিয়েটর এবং ইউটিউব।</li>
                <li>দিশারি কোনো ভিডিওর স্বত্ব দাবি করে না। ভিডিওগুলো কেবলমাত্র ইউটিউবের অফিশিয়াল আইফ্রেম এমবেড প্লেয়ারের মাধ্যমে চালানো হয়।</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">৪. এআই-উৎপাদিত শিক্ষামূলক উপকরণ</h2>
              <p>
                দিশারির কুইজ ও সারসংক্ষেপ এআই মডেল দ্বারা স্বয়ংক্রিয়ভাবে তৈরি হয়। এটি একটি অনুশীলনী সহায়তা। শিক্ষার্থীদের বোর্ড পাঠ্যবই (NCTB) ও শিক্ষকের নির্দেশনাকে চূড়ান্ত মানদণ্ড হিসেবে গ্রহণের অনুরোধ করা হচ্ছে।
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">৫. শিক্ষার্থীদের দায়িত্ব ও সুষ্ঠু ব্যবহার</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>সঠিক বয়স ও জন্মসাল প্রদান করা।</li>
                <li>অ্যাকাউন্টের পাসওয়ার্ড ও লগইন তথ্যের নিরাপত্তা বজায় রাখা।</li>
                <li>প্ল্যাটফর্মে কোনো ক্ষতিকারক কোড বা স্বয়ংক্রিয় স্ক্রিপ্ট চালানো থেকে বিরত থাকা।</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">৬. পরিসমাপ্তি ও অ্যাকাউন্ট বাতিল</h2>
              <p>
                শিক্ষার্থী যেকোনো সময় সেটিংস থেকে নিজের অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলতে পারেন। শর্তাবলী লঙ্ঘনকারী কোনো ব্যবহারকারীকে নোটিশ প্রদানের মাধ্যমে নিষিদ্ধ করার অধিকার দিশারি সংরক্ষণ করে।
              </p>
            </section>

            <section className="space-y-2 pt-4 border-t border-slate-700">
              <h2 className="text-lg font-bold text-slate-100">৭. যোগাযোগ</h2>
              <p>
                শর্তাবলী সংক্রান্ত যেকোনো বিষয়ে যোগাযোগ করুন:{' '}
                <a href="mailto:support@dishari.app" className="text-teal-400 underline">
                  support@dishari.app
                </a>
              </p>
            </section>
          </div>
        ) : (
          <div className="mt-8 space-y-6 text-sm text-slate-300 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Dishari, you agree to be bound by these Terms of Service and acknowledge the official{' '}
                <a
                  href="https://www.youtube.com/t/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-400 underline"
                >
                  YouTube Terms of Service
                </a>
                .
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">2. Nature of the Service</h2>
              <p>
                Dishari is an educational utility that organizes publicly available YouTube playlists into structured study routines. Dishari is independent and does not represent YouTube or third-party content creators.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">3. Intellectual Property Rights</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>All rights in video titles, channel names, and video playback remain the exclusive property of their respective creators and YouTube LLC.</li>
                <li>Dishari does not claim ownership of video content and embeds video streams strictly via standard YouTube player embeds.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">4. AI-Generated Study Materials</h2>
              <p>
                Summaries and quizzes are generated as study aids by AI models. Students are advised to verify curriculum-critical questions with their official NCTB textbooks and educators.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">5. Acceptable Use Policy</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Provide accurate profile age and birth year information.</li>
                <li>Maintain the confidentiality of your authentication credentials.</li>
                <li>Do not abuse AI quotas, reverse-engineer, or attempt denial of service against the platform.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">6. Termination</h2>
              <p>
                You may terminate your account at any time through the Settings page. Dishari reserves the right to suspend accounts that violate acceptable use standards.
              </p>
            </section>

            <section className="space-y-2 pt-4 border-t border-slate-700">
              <h2 className="text-lg font-bold text-slate-100">7. Contact Information</h2>
              <p>
                Inquiries regarding these terms should be addressed to:{' '}
                <a href="mailto:support@dishari.app" className="text-teal-400 underline">
                  support@dishari.app
                </a>
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
