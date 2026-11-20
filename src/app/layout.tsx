import type { Metadata, Viewport } from 'next';
import { Tiro_Bangla, Anek_Bangla } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import '../styles/globals.css';
import { ThemeProvider } from '@/components/theme-provider';

const tiroBangla = Tiro_Bangla({
  weight: '400',
  subsets: ['bengali', 'latin'],
  variable: '--font-tiro-bangla',
  display: 'swap',
});

const anekBangla = Anek_Bangla({
  subsets: ['bengali', 'latin'],
  variable: '--font-anek-bangla',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Dishari — দিশারি',
  description:
    'Paste a YouTube playlist, get a study schedule. Bangla-first, mobile-first learning.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F7F4' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1B23' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir="ltr"
      className={`${tiroBangla.variable} ${anekBangla.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-paper text-ink font-ui antialiased">
        <a href="#main-content" className="skip-link">
          {locale === 'bn' ? 'মূল বিষয়বস্তুতে যান' : 'Skip to main content'}
        </a>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
