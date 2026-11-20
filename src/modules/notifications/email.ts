/**
 * Resend Email Delivery & One-Click Unsubscribe (architecture.md §11 & phases.md §1 Phase 5)
 * Sends class study reminders and weekly summaries.
 * Includes one-click unsubscribe in headers and footer.
 */
import { Resend } from 'resend';

export interface ClassReminderEmailParams {
  to: string;
  studentName?: string;
  classTitle: string;
  playlistTitle?: string;
  classUrl: string;
  unsubscribeUrl: string;
  locale?: 'bn' | 'en';
}

export interface WeeklySummaryEmailParams {
  to: string;
  studentName?: string;
  weekRange: string;
  adherenceRate: number;
  totalMinutes: number;
  quizAverage: number;
  planHealth: 'on_track' | 'behind' | 'completed';
  dashboardUrl: string;
  unsubscribeUrl: string;
  locale?: 'bn' | 'en';
}

export interface EmailSendResult {
  success: boolean;
  id?: string;
  error?: string;
  mocked?: boolean;
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  return new Resend(apiKey);
}

function getFromAddress(): string {
  const from = process.env.REMINDER_FROM_EMAIL || 'onboarding@resend.dev';
  return from.includes('<') ? from : `দিশারি <${from}>`;
}

/**
 * Sends an email study reminder for an upcoming class.
 */
export async function sendClassReminderEmail(
  params: ClassReminderEmailParams
): Promise<EmailSendResult> {
  const resend = getResendClient();
  const from = getFromAddress();
  const isBn = params.locale !== 'en';

  const subject = isBn
    ? `দিশারি: ${params.classTitle} পড়ার সময় হয়েছে`
    : `Dishari: Time for your class - ${params.classTitle}`;

  const greeting = isBn ? 'প্রিয় শিক্ষার্থী,' : 'Dear Student,';
  const message = isBn
    ? `আপনার আজকের নির্ধারিত ক্লাস <strong>${params.classTitle}</strong> প্রস্তুত রয়েছে।`
    : `Your scheduled class <strong>${params.classTitle}</strong> is ready.`;

  const playlistInfo = params.playlistTitle
    ? `<p style="color: #64748b; font-size: 14px; margin-top: 4px;">${isBn ? 'প্লেলিস্ট:' : 'Playlist:'} ${params.playlistTitle}</p>`
    : '';

  const ctaText = isBn ? 'ক্লাস শুরু করুন' : 'Start Class';
  const unsubText = isBn
    ? 'রিমাইন্ডার বন্ধ করতে চাইলে <a href="' + params.unsubscribeUrl + '">এখানে ক্লিক করুন</a>।'
    : 'To unsubscribe from class reminders, <a href="' + params.unsubscribeUrl + '">click here</a>.';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
      <h2 style="color: #0f172a; margin-top: 0;">দিশারি</h2>
      <p style="font-size: 16px;">${greeting}</p>
      <p style="font-size: 16px; line-height: 1.5;">${message}</p>
      ${playlistInfo}
      <div style="margin: 28px 0;">
        <a href="${params.classUrl}" style="background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;">
          ${ctaText}
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        ${unsubText}
      </p>
    </div>
  `;

  if (!resend) {
    // In dev / test when RESEND_API_KEY is not set
    return {
      success: true,
      id: 'mock-email-' + Date.now(),
      mocked: true,
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject,
      html,
      headers: {
        'List-Unsubscribe': `<${params.unsubscribeUrl}>`,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Email delivery failed';
    return { success: false, error: msg };
  }
}

/**
 * Sends a weekly performance summary email.
 */
export async function sendWeeklySummaryEmail(
  params: WeeklySummaryEmailParams
): Promise<EmailSendResult> {
  const resend = getResendClient();
  const from = getFromAddress();
  const isBn = params.locale !== 'en';

  const subject = isBn
    ? `দিশারি: সাপ্তাহিক পড়ার অগ্রগতি (${params.weekRange})`
    : `Dishari: Weekly Study Summary (${params.weekRange})`;

  const statusLabel = isBn
    ? params.planHealth === 'on_track' ? 'সঠিক গতিতে আছেন' : 'কিছু ক্লাস বাকি আছে'
    : params.planHealth === 'on_track' ? 'On Track' : 'Classes to Catch Up';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
      <h2 style="color: #0f172a; margin-top: 0;">দিশারি — সাপ্তাহিক সারসংক্ষেপ</h2>
      <p style="font-size: 15px; color: #475569;">${params.weekRange}</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b;">${isBn ? 'রুটিন পালন:' : 'Adherence:'}</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${params.adherenceRate}%</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">${isBn ? 'পড়ার সময়:' : 'Study Time:'}</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${params.totalMinutes} ${isBn ? 'মিনিট' : 'mins'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">${isBn ? 'কুইজের গড় স্কোর:' : 'Quiz Average:'}</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${params.quizAverage}%</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">${isBn ? 'অগ্রগতির অবস্থা:' : 'Plan Health:'}</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #0284c7;">${statusLabel}</td>
          </tr>
        </table>
      </div>

      <div style="margin: 24px 0;">
        <a href="${params.dashboardUrl}" style="background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;">
          ${isBn ? 'ড্যাশবোর্ড দেখুন' : 'View Dashboard'}
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        <a href="${params.unsubscribeUrl}">${isBn ? 'আনসাবস্ক্রাইব করুন' : 'Unsubscribe'}</a>
      </p>
    </div>
  `;

  if (!resend) {
    return {
      success: true,
      id: 'mock-summary-' + Date.now(),
      mocked: true,
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject,
      html,
      headers: {
        'List-Unsubscribe': `<${params.unsubscribeUrl}>`,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Weekly summary delivery failed';
    return { success: false, error: msg };
  }
}
