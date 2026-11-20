import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    rules: {
      '*.css': {
        as: '*.css',
        loaders: ['@tailwindcss/turbopack'],
      },
    },
  },
  async redirects() {
    return [
      {
        source: '/sign-in',
        destination: '/auth/sign-in',
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
