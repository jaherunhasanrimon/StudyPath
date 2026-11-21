import Link from 'next/link';

export default function AdminOverviewPage() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/queue"
          className="p-5 rounded-card border border-border bg-surface hover:border-river transition-all block group"
        >
          <div className="text-2xl mb-2">📋</div>
          <h2 className="font-semibold text-ink group-hover:text-river">প্রশ্ন রিভিউ কিউ</h2>
          <p className="text-xs text-slate mt-1">
            শিক্ষার্থীদের রিপোর্ট করা প্রশ্নগুলো পর্যবেক্ষণ করুন, সংশোধন করুন বা ১-ক্লিকে লুকিয়ে দিন।
          </p>
        </Link>

        <Link
          href="/admin/opt-outs"
          className="p-5 rounded-card border border-border bg-surface hover:border-river transition-all block group"
        >
          <div className="text-2xl mb-2">🛡️</div>
          <h2 className="font-semibold text-ink group-hover:text-river">ক্রিয়েটর অপ্ট-আউট</h2>
          <p className="text-xs text-slate mt-1">
            ইউটিউব চ্যানেলভিত্তিক অপ্ট-আউট ম্যানেজ করুন এবং ১-ক্লিকে শেয়ার্ড ইনসাইট মুছে দিন।
          </p>
        </Link>

        <Link
          href="/admin/pilot"
          className="p-5 rounded-card border border-border bg-surface hover:border-river transition-all block group"
        >
          <div className="text-2xl mb-2">📊</div>
          <h2 className="font-semibold text-ink group-hover:text-river">পাইলট অ্যানালিটিক্স</h2>
          <p className="text-xs text-slate mt-1">
            সপ্তাহ ১, ৪, ৮ রিটেনশন কার্ভ, রুটিন সমাপ্তির হার এবং এআই খরচ ($USD) ট্র্যাক করুন।
          </p>
        </Link>

        <Link
          href="/admin/feedback"
          className="p-5 rounded-card border border-border bg-surface hover:border-river transition-all block group"
        >
          <div className="text-2xl mb-2">💬</div>
          <h2 className="font-semibold text-ink group-hover:text-river">ফিডব্যাক ইনবক্স</h2>
          <p className="text-xs text-slate mt-1">
            শিক্ষার্থী ও ব্যবহারকারীদের পাঠানো সরাসরি মতামত, বাগ রিপোর্ট ও পরামর্শ পর্যালোচনা করুন।
          </p>
        </Link>
      </div>

      <div className="rounded-card border border-border bg-surface p-6 space-y-4">
        <h2 className="text-lg font-semibold text-ink">পাইলট নির্দেশিকা ও নীতিমালা (Pilot Protocol)</h2>
        <ul className="text-sm text-slate space-y-2 list-disc list-inside">
          <li>
            <strong>প্রশ্ন গোপনকরণ নীতি:</strong> কোনো প্রশ্নে তথ্যগত বিভ্রান্তি বা ভুল থাকলে তা অবিলম্বে <em>Hide</em> করুন। RLS পলিসির কারণে ১ মিনিটের মধ্যে সকল শিক্ষার্থীর ইন্টারফেস থেকে প্রশ্নটি অদৃশ্য হয়ে যাবে।
          </li>
          <li>
            <strong>ক্রিয়েটর স্বত্বাধিকার নীতি:</strong> ইউটিউব চ্যানেল মালিকদের যেকোনো আপত্তি পাওয়া মাত্র সংশ্লিষ্ট চ্যানেল অপ্ট-আউটভুক্ত করুন এবং ইনসাইট পার্জ করুন।
          </li>
          <li>
            <strong>নাবালক শিক্ষার্থী সুরক্ষা:</strong> ১৮ বছরের কম বয়সী শিক্ষার্থীদের ক্ষেত্রে অভিভাবকের সম্মতি ছাড়া অ্যাকাউন্ট সক্রিয় করা নিষিদ্ধ।
          </li>
        </ul>
      </div>
    </div>
  );
}
