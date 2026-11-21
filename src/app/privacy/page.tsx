'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
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
              {lang === 'bn' ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'bn'
                ? 'সর্বশেষ হালনাগাদ: নভেম্বর ২০২৬ • বাংলাদেশ ডেটা সুরক্ষা আইন (PDPA ২০২৬) অনুগত'
                : 'Last updated: November 2026 • Compliant with Bangladesh PDPA 2026'}
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
              <h2 className="text-lg font-bold text-slate-100">১. আমাদের পরিচয় ও মূল দর্শন</h2>
              <p>
                <strong>দিশারি</strong> বাংলাদেশের মাধ্যমিক ও উচ্চমাধ্যমিক শিক্ষার্থীদের (বয়স সাধারণত ১৫ থেকে ১৮ বছর) জন্য তৈরি একটি স্টাডি পাথওয়ে প্ল্যাটফর্ম। আমাদের মূল লক্ষ্য হল শিক্ষার্থীদের ইউটিউবের শিক্ষামূলক প্লেলিস্ট সাজিয়ে নিয়মানুবর্তিতার সাথে পড়তে সাহায্য করা। আমরা শিক্ষার্থীদের ডেটা সুরক্ষাকে সর্বোচ্চ প্রাধান্য দিই।
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">২. কোনো বিজ্ঞাপন বা ট্র্যাকার নেই (Zero Ads, Zero Trackers)</h2>
              <p>
                দিশারিতে কোনো ধরনের বাণিজ্যিক বিজ্ঞাপন, অ্যাড-নেটওয়ার্ক বা থার্ড-পার্টি ট্র্যাকার নেই। শিক্ষার্থীদের মনোযোগ নষ্ট করে এমন কোনো বিজ্ঞাপনী কুকি বা আচরণগত ট্র্যাকিং আমরা করি না।
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">৩. অপ্রাপ্তবয়স্কদের সুরক্ষা ও অভিভাবকের সম্মতি (PDPA 2026)</h2>
              <p>
                বাংলাদেশ ডেটা সুরক্ষা আইন ২০২৬ অনুযায়ী ১৮ বছরের কম বয়সী শিক্ষার্থীদের সুরক্ষায় বিশেষ ব্যবস্থা নেওয়া হয়েছে:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>১৮ বছরের কম বয়সী শিক্ষার্থীদের অ্যাকাউন্টে এআই অনুশীলন এবং স্টাডি রিমাইন্ডার স্বয়ংক্রিয়ভাবে লক থাকে।</li>
                <li>অভিভাবকের ইমেইলে যাচাইকরণ লিংক পাঠিয়ে অভিভাবকের সক্রিয় সম্মতি (Guardian Consent) পাওয়ার পরই কেবল এই ফিচারগুলো আনলক হয়।</li>
                <li>অভিভাবক যেকোনো সময় প্রদত্ত সম্মতি প্রত্যাহার করতে পারেন।</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">৪. ইউটিউব (YouTube) এপিআই ও ভিডিও প্লেব্যাক নীতি</h2>
              <p>
                দিশারি ইউটিউবের শর্তাবলী (YouTube Terms of Service) এবং গুগল এপিআই ব্যবহারকারী ডেটা নীতি পূর্ণাঙ্গভাবে মেনে চলে:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>ভিডিওগুলো শুধুমাত্র অফিশিয়াল ইউটিউব আইফ্রেম প্লেয়ার (<code className="text-teal-400">youtube-nocookie.com</code>)-এর মাধ্যমে এমবেড করা হয়।</li>
                <li>আমরা কখনো ইউটিউব ভিডিও ডাউনলোড, স্ক্র্যাপ বা নিজস্ব সার্ভারে হোস্ট করি না।</li>
                <li>ভিডিওর মূল চ্যানেল এবং নির্মাতাকে সর্বদা যথাযথ স্বীকৃতি দেওয়া হয়। কোনো ইউটিউব ভিডিওর জন্য আমরা ফি নিই না।</li>
                <li>ইউটিউব থেকে আনা মেটাডাটা ৩০ দিনের মধ্যে রিফ্রেশ অথবা মুছে ফেলা হয়।</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">৫. আমরা কী তথ্য সংরক্ষণ করি?</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>প্রোফাইল তথ্য:</strong> নাম, ইমেইল, জন্মসাল এবং ভাষা পছন্দ।</li>
                <li><strong>স্টাডি রুটিন ও অগ্রগতি:</strong> তৈরি করা স্টাডি প্ল্যান, ক্লাসের টিকমার্ক এবং কুইজ স্কোর।</li>
                <li><strong>সম্মতি রেকর্ড:</strong> অভিভাবকের ইমেইল ও সম্মতির স্থিতি।</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">৬. ডেটা ধারণ ও মুছে ফেলার নিয়ম (Data Retention)</h2>
              <p>
                এআই ব্যবহারের অডিট লগগুলো ৩০ দিন পর স্বয়ংক্রিয়ভাবে সিস্টেম থেকে সম্পূর্ণ মুছে ফেলা হয়।
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">৭. আপনার অধিকার: ডেটা ডাউনলোড ও অ্যাকাউন্ট ডিলিট</h2>
              <p>
                প্রতিটি শিক্ষার্থী তার সেটিংস পাতা থেকে:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>ডেটা এক্সপোর্ট:</strong> নিজের সমস্ত স্টাডি রেকর্ড এক ক্লিকে JSON ফাইলে ডাউনলোড করতে পারবেন।</li>
                <li><strong>অ্যাকাউন্ট ডিলিট:</strong> যেকোনো সময় অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলতে পারবেন। অ্যাকাউন্ট ডিলিট করার সাথে সাথে সমস্ত ডেটা ডাটাবেজ থেকে স্থায়ীভাবে বিলীন হয়ে যায়।</li>
              </ul>
            </section>

            <section className="space-y-2 pt-4 border-t border-slate-700">
              <h2 className="text-lg font-bold text-slate-100">৮. যোগাযোগ</h2>
              <p>
                গোপনীয়তা বা ডেটা সুরক্ষা সংক্রান্ত যেকোনো প্রশ্ন বা পরামর্শের জন্য আমাদের সাথে যোগাযোগ করুন:{' '}
                <a href="mailto:support@dishari.app" className="text-teal-400 underline">
                  support@dishari.app
                </a>
              </p>
            </section>
          </div>
        ) : (
          <div className="mt-8 space-y-6 text-sm text-slate-300 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">1. Identity & Purpose</h2>
              <p>
                <strong>Dishari</strong> is a study pathway platform designed for Bangladeshi secondary and higher secondary students (typically ages 15–18). Our purpose is to help students turn educational YouTube playlists into disciplined, day-by-day study routines. Protecting student privacy is fundamental to our architecture.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">2. Zero Ads and Zero Trackers</h2>
              <p>
                Dishari contains zero commercial advertisements and zero third-party ad network trackers. We do not engage in behavioral advertising, ad profiling, or commercial monetization of student data.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">3. Minor Protection & Guardian Consent (PDPA 2026)</h2>
              <p>
                Under the Bangladesh Personal Data Protection Act 2026 and child protection safeguards:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Students under the age of 18 have AI-assisted study features and automated notifications locked by default.</li>
                <li>These features can only be unlocked after a parent or legal guardian verifies and grants consent via a secure email link.</li>
                <li>Guardians may revoke their consent at any time.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">4. YouTube API & Video Playback Compliance</h2>
              <p>
                Dishari strictly adheres to the YouTube Terms of Service and Google API Services User Data Policy:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Videos are viewed strictly through YouTube&apos;s official embedded IFrame player (<code className="text-teal-400">youtube-nocookie.com</code>).</li>
                <li>We never download, scrape, re-host, re-dub, or clip YouTube videos.</li>
                <li>The original channel and creator receive full attribution on every class page. Playback is never paywalled.</li>
                <li>YouTube API metadata is refreshed or purged within 30 days.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">5. Data We Collect</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Profile Details:</strong> Name, email address, birth year, and language preferences.</li>
                <li><strong>Study Progress:</strong> Generated schedules, lesson completion status, personal notes, and quiz scores.</li>
                <li><strong>Guardian Consent Records:</strong> Guardian email address and verification status.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">6. Data Retention Policy</h2>
              <p>
                AI model invocation audit logs are permanently purged after 30 days. Student study records are maintained only while the account is active.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">7. Your Rights: Export & Permanent Deletion</h2>
              <p>
                Students have full self-service control over their data:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Data Export:</strong> Download a portable JSON copy of all personal records anytime from Settings.</li>
                <li><strong>Account Deletion:</strong> Permanently delete your account and all associated study data in real-time with database cascade deletion.</li>
              </ul>
            </section>

            <section className="space-y-2 pt-4 border-t border-slate-700">
              <h2 className="text-lg font-bold text-slate-100">8. Contact Us</h2>
              <p>
                For privacy inquiries or data rights requests, please contact:{' '}
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
