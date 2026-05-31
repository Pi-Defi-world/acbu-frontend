import { NextRequest, NextResponse } from 'next/server';

/**
 * CSP violation report endpoint.
 *
 * Browsers POST here when a Content-Security-Policy-Report-Only (or enforced
 * CSP) violation is detected. During the report-only phase this is the primary
 * signal for identifying directives that need relaxing before enforcement.
 *
 * In production you would forward these to a logging service (e.g. Sentry,
 * Datadog, or a custom store). For now we log to the server console so
 * violations are visible in Vercel / local dev logs.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      'csp-report'?: Record<string, unknown>;
      [key: string]: unknown;
    };

    const report = body['csp-report'] ?? body;

    // Log in a structured way so it's easy to grep in production logs
    console.warn('[CSP Violation]', JSON.stringify(report, null, 2));
  } catch {
    // Malformed report body — ignore silently
  }

  // 204 No Content is the correct response for CSP report endpoints
  return new NextResponse(null, { status: 204 });
}
