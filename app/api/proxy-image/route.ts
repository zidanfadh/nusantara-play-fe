import { NextRequest, NextResponse } from 'next/server';
import {
  ImageProxyError,
  PROXY_SECURITY_HEADERS,
  fetchImage,
  parseAllowedHosts,
  validateImageUrl,
} from '@/lib/security/image-proxy';

// node:dns and node:https are required; this route must not run on the Edge runtime.
export const runtime = 'nodejs';

// Protected by middleware.ts (not a public route): logged-out requests redirect to /login.

function errorResponse(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: PROXY_SECURITY_HEADERS });
}

export async function GET(request: NextRequest) {
  const allowedHosts = parseAllowedHosts(process.env.PROXY_IMAGE_ALLOWED_HOSTS);
  const validation = validateImageUrl(request.nextUrl.searchParams.get('url'), allowedHosts);
  if (!validation.ok) return errorResponse(validation.status, validation.error);

  try {
    const image = await fetchImage(validation.url);
    return new NextResponse(new Uint8Array(image.body), {
      status: 200,
      headers: {
        ...PROXY_SECURITY_HEADERS,
        'Content-Type': image.contentType,
        'Cache-Control': 'public, max-age=86400', // 24 hours, success only
      },
    });
  } catch (error) {
    if (error instanceof ImageProxyError) return errorResponse(error.status, error.message);
    console.error('proxy-image: unexpected error');
    return errorResponse(502, 'Failed to fetch image');
  }
}
