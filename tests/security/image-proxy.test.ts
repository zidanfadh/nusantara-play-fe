import { EventEmitter } from 'node:events';
import type { ClientRequest, IncomingMessage } from 'node:http';
import type { RequestOptions } from 'node:https';
import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));

import { lookup } from 'node:dns/promises';
import {
  DEFAULT_ALLOWED_HOSTS,
  ImageProxyError,
  MAX_IMAGE_BYTES,
  createPinnedLookup,
  fetchImage,
  isBlockedAddress,
  parseAllowedHosts,
  validateImageUrl,
  type RequestFn,
  type ResolvedAddress,
} from '@/lib/security/image-proxy';

const mockedLookup = vi.mocked(lookup) as unknown as ReturnType<
  typeof vi.fn<(host: string, opts: unknown) => Promise<ResolvedAddress[]>>
>;

const HOST = 'lh3.googleusercontent.com';
const IMG_URL = `https://${HOST}/a/photo=s96-c`;
const allowed = new Set([HOST]);
const PUBLIC_V4: ResolvedAddress = { address: '142.250.4.132', family: 4 };

interface FakeResponse {
  status?: number;
  headers?: Record<string, string>;
  chunks?: Buffer[];
}

/**
 * A stand-in for https.request. Like the real one it resolves the host through
 * options.lookup before "connecting", then delivers the response (or never does).
 */
function fakeRequest(response: FakeResponse | 'hang') {
  const seen: { options?: RequestOptions; connectedTo?: unknown } = {};
  const request: RequestFn = (url, options, onResponse) => {
    seen.options = options;
    const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: () => void };
    req.destroy = () => {};
    options.signal?.addEventListener('abort', () => req.emit('error', new Error('aborted')));
    req.end = () => {
      const lookupFn = options.lookup as unknown as (
        h: string,
        o: { all: boolean },
        cb: (err: Error | null, addrs: unknown) => void,
      ) => void;
      lookupFn(url.hostname, { all: true }, (err, addrs) => {
        if (err) return void req.emit('error', err);
        seen.connectedTo = addrs;
        if (response === 'hang') return;
        const res = Readable.from(response.chunks ?? [Buffer.from('img')]) as Readable &
          Partial<IncomingMessage>;
        res.statusCode = response.status ?? 200;
        res.headers = response.headers ?? { 'content-type': 'image/jpeg' };
        onResponse(res as IncomingMessage);
      });
    };
    return req as unknown as ClientRequest;
  };
  return { request, seen };
}

async function expectProxyError(p: Promise<unknown>, status: number) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ImageProxyError);
  expect((err as ImageProxyError).status).toBe(status);
}

beforeEach(() => {
  mockedLookup.mockReset();
  mockedLookup.mockResolvedValue([PUBLIC_V4]);
});

describe('parseAllowedHosts', () => {
  it('uses the default when unset or blank', () => {
    expect([...parseAllowedHosts(undefined)]).toEqual([...DEFAULT_ALLOWED_HOSTS]);
    expect([...parseAllowedHosts('  ')]).toEqual([...DEFAULT_ALLOWED_HOSTS]);
  });

  it('parses a comma-separated list of exact hostnames', () => {
    expect([...parseAllowedHosts(' A.example.com, b.example.com ,,')]).toEqual([
      'a.example.com',
      'b.example.com',
    ]);
  });
});

describe('validateImageUrl', () => {
  it('accepts an allowlisted https URL', () => {
    const r = validateImageUrl(IMG_URL, allowed);
    expect(r.ok).toBe(true);
  });

  it('accepts an explicit default port :443', () => {
    expect(validateImageUrl(`https://${HOST}:443/x.png`, allowed).ok).toBe(true);
  });

  it.each([
    ['missing url', null, 400],
    ['garbage', 'not a url', 400],
    ['http URL', `http://${HOST}/x.png`, 400],
    ['URL with credentials', `https://user:pass@${HOST}/x.png`, 400],
    ['URL with username only', `https://user@${HOST}/x.png`, 400],
    ['custom port', `https://${HOST}:8443/x.png`, 400],
    ['host not in the allowlist', 'https://evil.example.com/x.png', 403],
    ['allowlisted suffix trick', `https://${HOST}.evil.example.com/x.png`, 403],
    ['subdomain of allowlisted host', `https://a.${HOST}/x.png`, 403],
    ['IP literal', 'https://169.254.169.254/latest/meta-data', 403],
  ])('rejects %s', (_name, raw, status) => {
    const r = validateImageUrl(raw, allowed);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(status);
  });
});

describe('isBlockedAddress', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '192.168.1.1',
    '100.64.0.1',
    '169.254.169.254',
    '0.0.0.0',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    '::ffff:127.0.0.1',
    '::ffff:a9fe:a9fe',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'ff02::1',
    '64:ff9b::7f00:1',
    '2002:7f00:1::1',
    '2001:db8::1',
    'not-an-ip',
  ])('blocks %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each(['142.250.4.132', '8.8.8.8', '2607:f8b0:4004:c1b::84'])('allows public %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });
});

describe('fetchImage', () => {
  it('returns the image for an allowed host with a public address', async () => {
    const { request } = fakeRequest({ headers: { 'content-type': 'image/png; charset=x' } });
    const img = await fetchImage(new URL(IMG_URL), { request });
    expect(img.contentType).toBe('image/png');
    expect(img.body.toString()).toBe('img');
    expect(mockedLookup).toHaveBeenCalledWith(HOST, expect.objectContaining({ all: true }));
  });

  it.each([
    ['127.0.0.1', 4],
    ['10.0.0.5', 4],
    ['169.254.169.254', 4],
    ['::1', 6],
    ['fc00::1', 6],
    ['fd00:ec2::254', 6],
  ])('rejects a hostname resolving to %s before connecting', async (address, family) => {
    mockedLookup.mockResolvedValue([{ address, family }]);
    const { request, seen } = fakeRequest({});
    await expectProxyError(fetchImage(new URL(IMG_URL), { request }), 403);
    expect(seen.options).toBeUndefined(); // no request was made
  });

  it('rejects when any one of several addresses is private', async () => {
    mockedLookup.mockResolvedValue([PUBLIC_V4, { address: '10.0.0.1', family: 4 }]);
    const { request, seen } = fakeRequest({});
    await expectProxyError(fetchImage(new URL(IMG_URL), { request }), 403);
    expect(seen.options).toBeUndefined();
  });

  it('connects only to the validated address (no second DNS answer is used)', async () => {
    mockedLookup
      .mockResolvedValueOnce([PUBLIC_V4])
      .mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }]);
    const { request, seen } = fakeRequest({});
    await fetchImage(new URL(IMG_URL), { request });
    expect(mockedLookup).toHaveBeenCalledTimes(1);
    expect(seen.connectedTo).toEqual([PUBLIC_V4]);
    expect(seen.options?.agent).toBe(false);
  });

  it.each([301, 302, 307, 308])('treats a %s redirect as an error', async (status) => {
    const { request } = fakeRequest({
      status,
      headers: { location: 'http://169.254.169.254/', 'content-type': 'image/png' },
    });
    await expectProxyError(fetchImage(new URL(IMG_URL), { request }), 502);
  });

  it('treats a non-200 status as an error without echoing the body', async () => {
    const { request } = fakeRequest({
      status: 500,
      headers: { 'content-type': 'text/plain' },
      chunks: [Buffer.from('SECRET upstream body')],
    });
    const err = await fetchImage(new URL(IMG_URL), { request }).catch((e: unknown) => e);
    expect((err as ImageProxyError).status).toBe(502);
    expect((err as Error).message).not.toContain('SECRET');
  });

  it.each(['image/svg+xml', 'image/SVG+XML; charset=utf-8', 'text/html', 'application/octet-stream'])(
    'returns 415 for content type %s',
    async (type) => {
      const { request } = fakeRequest({ headers: { 'content-type': type } });
      await expectProxyError(fetchImage(new URL(IMG_URL), { request }), 415);
    },
  );

  it('returns 415 when the content type is missing', async () => {
    const { request } = fakeRequest({ headers: {} });
    await expectProxyError(fetchImage(new URL(IMG_URL), { request }), 415);
  });

  it('stops reading a body over 5 MB while streaming (no content-length)', async () => {
    const mb = Buffer.alloc(1024 * 1024, 1);
    const chunks = [mb, mb, mb, mb, mb, Buffer.alloc(1, 1), mb, mb];
    let pulled = 0;
    const { request } = fakeRequest({
      headers: { 'content-type': 'image/jpeg' },
      chunks: new Proxy(chunks, {
        get(target, prop, receiver) {
          if (prop === Symbol.iterator) {
            return function* () {
              for (const c of target) {
                pulled++;
                yield c;
              }
            };
          }
          return Reflect.get(target, prop, receiver);
        },
      }),
    });
    await expectProxyError(fetchImage(new URL(IMG_URL), { request }), 502);
    expect(pulled).toBeLessThan(chunks.length); // did not consume the whole body
  });

  it('accepts a body of exactly 5 MB', async () => {
    const { request } = fakeRequest({ chunks: [Buffer.alloc(MAX_IMAGE_BYTES, 1)] });
    const img = await fetchImage(new URL(IMG_URL), { request });
    expect(img.body.length).toBe(MAX_IMAGE_BYTES);
  });

  it('rejects a declared content-length over 5 MB before reading', async () => {
    const { request } = fakeRequest({
      headers: { 'content-type': 'image/jpeg', 'content-length': String(MAX_IMAGE_BYTES + 1) },
    });
    await expectProxyError(fetchImage(new URL(IMG_URL), { request }), 502);
  });

  it('times out with 504 when upstream never responds', async () => {
    const { request } = fakeRequest('hang');
    const start = Date.now();
    await expectProxyError(fetchImage(new URL(IMG_URL), { request, timeoutMs: 50 }), 504);
    expect(Date.now() - start).toBeLessThan(2000);
  });

  it('times out with 504 when DNS never answers', async () => {
    mockedLookup.mockReturnValue(new Promise(() => {}));
    const { request } = fakeRequest({});
    await expectProxyError(fetchImage(new URL(IMG_URL), { request, timeoutMs: 50 }), 504);
  });

  it('returns 502 when DNS fails', async () => {
    mockedLookup.mockRejectedValue(Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }));
    const { request } = fakeRequest({});
    await expectProxyError(fetchImage(new URL(IMG_URL), { request }), 502);
  });

  it('uses a 5 second default timeout', async () => {
    vi.useFakeTimers();
    try {
      const { request } = fakeRequest('hang');
      const p = fetchImage(new URL(IMG_URL), { request }).catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(4_999);
      let settled = false;
      void p.then(() => (settled = true));
      await Promise.resolve();
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(2);
      expect(((await p) as ImageProxyError).status).toBe(504);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('createPinnedLookup', () => {
  const addrs: ResolvedAddress[] = [PUBLIC_V4, { address: '2607:f8b0:4004:c1b::84', family: 6 }];

  it('returns all pinned addresses when all=true', () => {
    const cb = vi.fn();
    createPinnedLookup(addrs)('anything', { all: true }, cb);
    expect(cb).toHaveBeenCalledWith(null, addrs);
  });

  it('returns the first address of the requested family', () => {
    const cb = vi.fn();
    createPinnedLookup(addrs)('anything', { family: 6 }, cb);
    expect(cb).toHaveBeenCalledWith(null, '2607:f8b0:4004:c1b::84', 6);
  });

  it('errors when no pinned address has the requested family', () => {
    const cb = vi.fn();
    createPinnedLookup([PUBLIC_V4])('anything', { family: 6 }, cb);
    expect(cb.mock.calls[0][0]).toMatchObject({ code: 'ENOTFOUND' });
  });
});
