import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Security Headers & Content Security Policy (architecture.md §12 & phases.md §1 Phase 6)', () => {
  const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
  const content = fs.readFileSync(nextConfigPath, 'utf8');

  it('declares headers function with wildcard route mapping', () => {
    expect(content).toContain('async headers()');
    expect(content).toContain("source: '/(.*)'");
  });

  it('configures strict Content-Security-Policy with required embed origins and restrictions', () => {
    expect(content).toContain('Content-Security-Policy');
    expect(content).toContain("default-src 'self'");
    expect(content).toContain("frame-src 'self' https://www.youtube-nocookie.com");
    expect(content).toContain("https://*.supabase.co");
    expect(content).toContain("object-src 'none'");
    expect(content).toContain("frame-ancestors 'none'");
  });

  it('includes anti-clickjacking, MIME sniffing, and sensor protection headers', () => {
    expect(content).toContain("key: 'X-Frame-Options'");
    expect(content).toContain("value: 'DENY'");
    expect(content).toContain("key: 'X-Content-Type-Options'");
    expect(content).toContain("value: 'nosniff'");
    expect(content).toContain("key: 'Referrer-Policy'");
    expect(content).toContain("value: 'strict-origin-when-cross-origin'");
    expect(content).toContain("key: 'Permissions-Policy'");
    expect(content).toContain('browsing-topics=()');
  });
});
