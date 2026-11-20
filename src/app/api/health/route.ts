/**
 * Health check endpoint.
 * GET /api/health → 200 { status: 'ok', timestamp }
 */
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '0.1.0',
  });
}
