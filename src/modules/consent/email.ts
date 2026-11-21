/**
 * Guardian Consent Email Delivery (architecture.md §12 & phases.md §1 Phase 6)
 * Dispatches bilingual consent review emails via Resend.
 */
import { Resend } from 'resend';

export interface GuardianConsentEmailParams {
  to: string;
  studentName?: string;
  reviewUrl: string;
  locale?: 'bn' | 'en';
}

export async function sendGuardianConsentEmail(
  params: GuardianConsentEmailParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    // Local / test mock
    return { success: true, id: 'mock-guardian-email' };
  }

  const resend = new Resend(apiKey);
  const from = process.env.REMINDER_FROM_EMAIL || 'onboarding@resend.dev';
  const fromAddress = from.includes('<') ? from : `দিশারি <${from}>`;
  const isBn = params.locale !== 'en';

  const subject = isBn
    ? `দিশারি: ${params.studentName ? params.studentName + '-এর' : 'আপনার সন্তানের'} পড়াশোনার অ্যাকাউন্টের অভিভাবক সম্মতি`
    : `Dishari: Guardian consent for ${params.studentName || 'your child'}'s study account`;

  const html = isBn
    ? `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <h2 style="color: #0d9488;">দিশারি (Dishari) — অভিভাবকের সম্মতি অনুরোধ</h2>
        <p>আসসালামু আলাইকুম,</p>
        <p><strong>${params.studentName || 'আপনার সন্তান'}</strong> ইউটিউব প্লেলিস্টের মাধ্যমে পড়াশোনা পরিচালনা করার জন্য দিশারি প্ল্যাটফর্মে একটি শিক্ষার্থী অ্যাকাউন্ট তৈরি করেছে।</p>
        <p>বাংলাদেশ ডেটা সুরক্ষা আইন ২০২৬ এবং শিক্ষার্থীদের সুরক্ষা নীতির অংশ হিসেবে ১৮ বছরের কম বয়সী শিক্ষার্থীদের অ্যাকাউন্টে এআই অনুশীলন এবং স্টাডি রিমাইন্ডার সক্রিয় করার জন্য আপনার সম্মতি প্রয়োজন।</p>
        <p><strong>দিশারির অঙ্গীকার:</strong></p>
        <ul>
          <li>কোনো বাণিজ্যিক বিজ্ঞাপন বা ট্র্যাকার নেই।</li>
          <li>ব্যক্তিগত ডেটা বিক্রি বা অপ্রয়োজনীয় উদ্দেশ্যে ব্যবহার করা হয় না।</li>
          <li>আপনি যেকোনো সময় এই সম্মতি প্রত্যাহার করতে পারবেন।</li>
        </ul>
        <div style="margin: 32px 0;">
          <a href="${params.reviewUrl}" style="background-color: #0d9488; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            সম্মতি পর্যালোচনা ও অনুমোদন করুন
          </a>
        </div>
        <p style="font-size: 13px; color: #64748b;">বা সরাসরি এই লিংকে যান: <a href="${params.reviewUrl}">${params.reviewUrl}</a></p>
        <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px;">
          এই লিঙ্কটির মেয়াদ ৭ দিন পর্যন্ত থাকবে। আপনি যদি এই অনুরোধটি না পাঠিয়ে থাকেন, তবে এটি উপেক্ষা করতে পারেন।
        </p>
      </div>
    `
    : `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <h2 style="color: #0d9488;">Dishari — Guardian Consent Request</h2>
        <p>Hello,</p>
        <p><strong>${params.studentName || 'Your child'}</strong> has registered a student study account on Dishari to organize their YouTube playlist study pathway.</p>
        <p>In accordance with the Bangladesh Personal Data Protection Act (PDPA) 2026 and child safety standards, guardian consent is required before minors can access AI-assisted quizzes and automated study reminders.</p>
        <p><strong>Dishari Privacy Commitments:</strong></p>
        <ul>
          <li>Zero ads, zero ad trackers.</li>
          <li>No selling or unauthorized sharing of personal data.</li>
          <li>Full self-service data export and deletion at any time.</li>
        </ul>
        <div style="margin: 32px 0;">
          <a href="${params.reviewUrl}" style="background-color: #0d9488; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Review and Grant Consent
          </a>
        </div>
        <p style="font-size: 13px; color: #64748b;">Or visit: <a href="${params.reviewUrl}">${params.reviewUrl}</a></p>
        <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px;">
          This link will expire in 7 days. If you did not recognize this request, you may safely ignore it.
        </p>
      </div>
    `;

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: params.to,
      subject,
      html,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send guardian email';
    return { success: false, error: message };
  }
}
