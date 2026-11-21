/**
 * POST /api/playlists/resolve
 * Resolves a YouTube playlist URL or bare ID into an enriched preview.
 *
 * Enforces:
 * - Zod validation on request payload.
 * - Rate limit: 10 imports per hour.
 * - Typed error codes and localized error messages (bn/en).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolvePlaylist } from '@/modules/youtube/import';
import { checkRateLimit } from '@/lib/rate-limit';
import bn from '@/messages/bn.json';
import en from '@/messages/en.json';

const ResolveInputSchema = z.object({
  url: z.string().min(1, 'URL or playlist ID is required'),
});

const MESSAGES: Record<string, typeof bn> = {
  bn,
  en: en as unknown as typeof bn,
};

function getLocale(request: NextRequest): 'bn' | 'en' {
  const cookieLocale = request.cookies.get('locale')?.value;
  if (cookieLocale === 'en' || cookieLocale === 'bn') {
    return cookieLocale;
  }
  const acceptLang = request.headers.get('accept-language');
  if (acceptLang?.startsWith('en')) {
    return 'en';
  }
  return 'bn';
}

export async function POST(request: NextRequest) {
  const locale = getLocale(request);
  const t = MESSAGES[locale] || MESSAGES.bn;

  // 1. Rate limiting (10 requests/hour per client IP)
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  const rateCheck = await checkRateLimit(`resolve_${clientIp}`, 10, 3600);
  if (!rateCheck.success) {
    return NextResponse.json(
      {
        error: 'RATE_LIMITED',
        message:
          locale === 'bn'
            ? 'আপনি প্রতি ঘণ্টায় সর্বোচ্চ ১০টি প্লেলিস্ট ইমপোর্ট করতে পারবেন। কিছুক্ষণ পর আবার চেষ্টা করুন।'
            : 'Rate limit exceeded: 10 imports per hour. Please try again later.',
        reset: rateCheck.reset,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateCheck.reset - Math.floor(Date.now() / 1000)),
        },
      }
    );
  }

  // 2. Validate input body
  let bodyJson: unknown;
  try {
    bodyJson = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: 'INVALID_JSON',
        message: t.error.invalidUrl,
      },
      { status: 400 }
    );
  }

  const parseResult = ResolveInputSchema.safeParse(bodyJson);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'EMPTY_INPUT',
        message: t.error.emptyInput,
      },
      { status: 400 }
    );
  }

  const { url } = parseResult.data;

  // 3. Resolve playlist via YouTube import service
  try {
    const preview = await resolvePlaylist(url);
    return NextResponse.json(preview, { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    if (errorMsg === 'EMPTY_INPUT') {
      return NextResponse.json(
        { error: 'EMPTY_INPUT', message: t.error.emptyInput },
        { status: 400 }
      );
    }

    if (errorMsg === 'MIX_NOT_SUPPORTED') {
      return NextResponse.json(
        { error: 'MIX_NOT_SUPPORTED', message: t.error.mixNotSupported },
        { status: 400 }
      );
    }

    if (errorMsg === 'INVALID_URL' || errorMsg === 'INVALID_ID' || errorMsg === 'UNSUPPORTED_HOST') {
      return NextResponse.json(
        { error: errorMsg, message: t.error.invalidUrl },
        { status: 400 }
      );
    }

    if (errorMsg === 'PLAYLIST_NOT_FOUND') {
      return NextResponse.json(
        { error: 'PLAYLIST_NOT_FOUND', message: t.error.import },
        { status: 404 }
      );
    }

    if (errorMsg === 'PLAYLIST_PRIVATE') {
      return NextResponse.json(
        {
          error: 'PLAYLIST_PRIVATE',
          message:
            locale === 'bn'
              ? 'এই প্লেলিস্টটি প্রাইভেট। অনুগ্রহ করে এটি পাবলিক বা আনলিস্টেড করুন।'
              : 'This playlist is private. Please make it public or unlisted to import.',
        },
        { status: 403 }
      );
    }

    if (errorMsg === 'QUOTA_EXCEEDED') {
      return NextResponse.json(
        {
          error: 'QUOTA_EXCEEDED',
          message:
            locale === 'bn'
              ? 'আজকের YouTube কোটা শেষ। অনুগ্রহ করে আগামীকাল চেষ্টা করুন অথবা সংরক্ষিত রুটিন দেখুন।'
              : 'Daily YouTube quota limit reached. Please try again tomorrow or view cached plans.',
        },
        { status: 503 }
      );
    }

    if (errorMsg.startsWith('CONFIG_ERROR')) {
      return NextResponse.json(
        {
          error: 'CONFIG_ERROR',
          message:
            locale === 'bn'
              ? 'সার্ভারে YouTube API কী কনফিগার করা নেই। অনুগ্রহ করে Vercel বা এনভায়রনমেন্ট সেটিংসে YOUTUBE_API_KEY যুক্ত করুন।'
              : 'YouTube API key is missing or unconfigured. Please configure YOUTUBE_API_KEY in Vercel environment variables.',
        },
        { status: 500 }
      );
    }

    if (errorMsg.startsWith('UPSTREAM_ERROR')) {
      return NextResponse.json(
        {
          error: 'UPSTREAM_ERROR',
          message:
            locale === 'bn'
              ? 'YouTube API সংযোগে সমস্যা হয়েছে। লিংকটি পাবলিক কি না যাচাই করুন অথবা কিছুক্ষণ পর চেষ্টা করুন।'
              : 'YouTube API connection error. Please ensure the playlist is public or try again later.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: t.error.generic },
      { status: 500 }
    );
  }
}
