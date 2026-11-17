/**
 * Validation and fetching for the /api/proxy-image route (Phase 04, finding F1).
 *
 * Kept free of Next.js imports so it can be unit tested. The route only wires
 * request/response objects to these functions.
 *
 * SSRF defences, in order:
 *   1. URL shape: https only, no credentials, default port only.
 *   2. Exact hostname allowlist (PROXY_IMAGE_ALLOWED_HOSTS, default DEFAULT_ALLOWED_HOSTS).
 *   3. The hostname is resolved once with node:dns; every address must be public.
 *   4. The HTTPS socket connects to exactly those already-validated addresses (pinned
 *      `lookup`), so a second DNS answer (DNS rebinding) is never used.
 *   5. Redirects are never followed (node:https does not follow them; 3xx is an error).
 *   6. 5 s overall timeout, image/* only (no SVG), 5 MB cap enforced while streaming.
 */
import { lookup as dnsLookup } from 'node:dns/promises';
import type { ClientRequest, IncomingMessage } from 'node:http';
import https, { type RequestOptions } from 'node:https';
import { BlockList, isIP } from 'node:net';

/**
 * Hosts allowed when PROXY_IMAGE_ALLOWED_HOSTS is unset or blank. The only caller
 * (components/dashboard/ProfileCard.tsx) proxies Google profile photos, which Supabase
 * Google OAuth stores in avatar_url as https://lh3.googleusercontent.com/... .
 */
export const DEFAULT_ALLOWED_HOSTS: readonly string[] = ['lh3.googleusercontent.com'];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const FETCH_TIMEOUT_MS = 5_000;
const MAX_URL_LENGTH = 2048;

/** Headers set on every proxy response, success or error. */
export const PROXY_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; sandbox",
};

/** Error with an HTTP status and a short, generic message that is safe to return. */
export class ImageProxyError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ImageProxyError';
  }
}

// ---------------------------------------------------------------------------
// Allowlist and URL validation
// ---------------------------------------------------------------------------

/** Parses a comma-separated list of exact hostnames. Unset or blank -> defaults. */
export function parseAllowedHosts(raw: string | undefined): Set<string> {
  if (raw === undefined || raw.trim() === '') return new Set(DEFAULT_ALLOWED_HOSTS);
  return new Set(
    raw
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter((h) => h !== ''),
  );
}

export type UrlValidationResult =
  | { ok: true; url: URL }
  | { ok: false; status: number; error: string };

export function validateImageUrl(
  raw: string | null | undefined,
  allowedHosts: ReadonlySet<string>,
): UrlValidationResult {
  if (!raw) return { ok: false, status: 400, error: 'URL parameter is required' };
  if (raw.length > MAX_URL_LENGTH) return { ok: false, status: 400, error: 'Invalid URL' };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, status: 400, error: 'Invalid URL' };
  }

  if (url.protocol !== 'https:') return { ok: false, status: 400, error: 'Invalid URL' };
  if (url.username !== '' || url.password !== '') {
    return { ok: false, status: 400, error: 'Invalid URL' };
  }
  // WHATWG URL normalises :443 to '' for https, so any non-empty port is non-default.
  if (url.port !== '') return { ok: false, status: 400, error: 'Invalid URL' };
  if (!allowedHosts.has(url.hostname.toLowerCase())) {
    return { ok: false, status: 403, error: 'Host not allowed' };
  }
  return { ok: true, url };
}

// ---------------------------------------------------------------------------
// IP address filtering
// ---------------------------------------------------------------------------

const BLOCKED_V4: ReadonlyArray<[string, number]> = [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local (incl. cloud metadata 169.254.169.254)
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.88.99.0', 24], // 6to4 relay anycast (deprecated)
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, incl. broadcast 255.255.255.255
];

// IPv6: only global unicast (2000::/3) is allowed. That already excludes ::, ::1,
// IPv4-mapped ::ffff:0:0/96, NAT64 64:ff9b::/96, discard 100::/64, ULA fc00::/7,
// link-local fe80::/10, site-local fec0::/10 and multicast ff00::/8.
// Inside 2000::/3 these special-purpose ranges are blocked as well:
const BLOCKED_V6_IN_GLOBAL: ReadonlyArray<[string, number]> = [
  ['2001::', 23], // IETF protocol assignments (incl. Teredo 2001::/32)
  ['2001:db8::', 32], // documentation
  ['2002::', 16], // 6to4 (can embed a private IPv4 address)
  ['3fff::', 20], // documentation
];

const blockedV4 = new BlockList();
for (const [net, prefix] of BLOCKED_V4) blockedV4.addSubnet(net, prefix, 'ipv4');

const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');

const blockedV6 = new BlockList();
for (const [net, prefix] of BLOCKED_V6_IN_GLOBAL) blockedV6.addSubnet(net, prefix, 'ipv6');

/** True when the address must not be contacted. Anything unparseable is blocked. */
export function isBlockedAddress(ip: string): boolean {
  try {
    const version = isIP(ip);
    if (version === 4) return blockedV4.check(ip, 'ipv4');
    if (version === 6) {
      if (ip.includes('%')) return true; // zone index => link-local scope
      if (!globalV6.check(ip, 'ipv6')) return true;
      return blockedV6.check(ip, 'ipv6');
    }
  } catch {
    // fall through
  }
  return true;
}

// ---------------------------------------------------------------------------
// DNS resolution and fetching
// ---------------------------------------------------------------------------

export interface ResolvedAddress {
  address: string;
  family: number;
}

export type LookupAllFn = (
  hostname: string,
  options: { all: true; verbatim?: boolean },
) => Promise<ResolvedAddress[]>;

/**
 * Resolves the hostname once and rejects it if ANY returned address is not public
 * (an attacker-controlled record could mix a public and a private address).
 */
export async function resolveSafeAddresses(
  hostname: string,
  lookupFn: LookupAllFn = dnsLookup as unknown as LookupAllFn,
): Promise<ResolvedAddress[]> {
  let addresses: ResolvedAddress[];
  try {
    addresses = await lookupFn(hostname, { all: true, verbatim: true });
  } catch {
    throw new ImageProxyError(502, 'Failed to fetch image');
  }
  if (addresses.length === 0) throw new ImageProxyError(502, 'Failed to fetch image');
  if (addresses.some((a) => isBlockedAddress(a.address))) {
    throw new ImageProxyError(403, 'Host not allowed');
  }
  return addresses;
}

type NodeLookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | ResolvedAddress[],
  family?: number,
) => void;

/** A net `lookup` that only ever hands out the pre-validated addresses. */
export function createPinnedLookup(addresses: readonly ResolvedAddress[]) {
  return (
    _hostname: string,
    options: { family?: number | string; all?: boolean },
    callback: NodeLookupCallback,
  ): void => {
    const family =
      options.family === 4 || options.family === 'IPv4'
        ? 4
        : options.family === 6 || options.family === 'IPv6'
          ? 6
          : 0;
    const usable = family === 0 ? [...addresses] : addresses.filter((a) => a.family === family);
    if (usable.length === 0) {
      const err: NodeJS.ErrnoException = new Error('No usable address');
      err.code = 'ENOTFOUND';
      callback(err, '', 0);
      return;
    }
    if (options.all) callback(null, usable);
    else callback(null, usable[0].address, usable[0].family);
  };
}

export type RequestFn = (
  url: URL,
  options: RequestOptions,
  onResponse: (res: IncomingMessage) => void,
) => ClientRequest;

export interface FetchImageOptions {
  timeoutMs?: number;
  maxBytes?: number;
  lookupFn?: LookupAllFn;
  request?: RequestFn;
}

export interface FetchedImage {
  contentType: string;
  body: Buffer;
}

function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) reject(new Error('aborted'));
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });
}

function sendRequest(
  url: URL,
  addresses: readonly ResolvedAddress[],
  signal: AbortSignal,
  request: RequestFn,
): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NusantaraLegacyImageProxy/1.0)',
          Accept: 'image/*',
        },
        // Pin the connection to the validated addresses; no second DNS lookup.
        lookup: createPinnedLookup(addresses) as unknown as RequestOptions['lookup'],
        // No shared keep-alive sockets between requests.
        agent: false,
        signal,
      },
      resolve,
    );
    req.on('error', reject);
    req.end();
  });
}

const IMAGE_TYPE = /^image\/[a-z0-9.+-]+$/;

async function readImage(res: IncomingMessage, maxBytes: number): Promise<FetchedImage> {
  const status = res.statusCode ?? 0;
  if (status >= 300 && status < 400) {
    res.destroy();
    throw new ImageProxyError(502, 'Failed to fetch image');
  }
  if (status !== 200) {
    res.destroy();
    throw new ImageProxyError(502, 'Failed to fetch image');
  }

  const rawType = res.headers['content-type'];
  const contentType = String(rawType ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (!IMAGE_TYPE.test(contentType) || contentType === 'image/svg+xml') {
    res.destroy();
    throw new ImageProxyError(415, 'Unsupported content type');
  }

  const declared = Number(res.headers['content-length']);
  if (Number.isFinite(declared) && declared > maxBytes) {
    res.destroy();
    throw new ImageProxyError(502, 'Image too large');
  }

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of res) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    total += buf.length;
    if (total > maxBytes) {
      res.destroy();
      throw new ImageProxyError(502, 'Image too large');
    }
    chunks.push(buf);
  }
  return { contentType, body: Buffer.concat(chunks, total) };
}

/**
 * Fetches an already validated URL (see validateImageUrl). Throws ImageProxyError
 * with a generic message; upstream bodies are never included in errors.
 */
export async function fetchImage(url: URL, options: FetchImageOptions = {}): Promise<FetchedImage> {
  const timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? MAX_IMAGE_BYTES;
  const request = options.request ?? (https.request as unknown as RequestFn);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const aborted = rejectOnAbort(controller.signal);
  aborted.catch(() => {}); // avoid an unhandled rejection when nothing awaits it

  try {
    const addresses = await Promise.race([
      resolveSafeAddresses(url.hostname, options.lookupFn),
      aborted,
    ]);
    const res = await Promise.race([
      sendRequest(url, addresses, controller.signal, request),
      aborted,
    ]);
    return await Promise.race([readImage(res, maxBytes), aborted]);
  } catch (err) {
    if (err instanceof ImageProxyError) throw err;
    if (controller.signal.aborted) throw new ImageProxyError(504, 'Upstream timeout');
    throw new ImageProxyError(502, 'Failed to fetch image');
  } finally {
    clearTimeout(timer);
    controller.abort(); // tears down any socket still open after an early exit
  }
}
