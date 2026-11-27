/**
 * Phase 29 step 1: in supabase mode `apiClient` sends exactly what it sent before (Content-Type + Bearer when
 * a session exists, no credentials option, no CSRF header) and never retries a 401.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getAccessToken = vi.fn();
const handleUnauthorized = vi.fn();
vi.mock('@/lib/auth/client', () => ({
  authClient: {
    mode: 'supabase',
    getAccessToken: () => getAccessToken(),
    handleUnauthorized: () => handleUnauthorized(),
  },
}));
vi.stubEnv('NEXT_PUBLIC_BACKEND_API_URL', 'http://localhost:3000/api');
vi.stubEnv('NODE_ENV', 'development');

const { apiClient, ApiError, authorizedFetch } = await import('@/lib/api/client');

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  getAccessToken.mockReset();
  handleUnauthorized.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('apiClient in supabase mode', () => {
  it('sends Content-Type and the Bearer token, nothing else', async () => {
    getAccessToken.mockResolvedValue('tok');
    fetchMock.mockResolvedValue(json(200, { ok: 1 }));
    expect(await apiClient.get('/users/me')).toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/users/me');
    expect(init).toEqual({
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
    });
  });

  it('sends no Authorization header without a session', async () => {
    getAccessToken.mockResolvedValue(null);
    fetchMock.mockResolvedValue(json(200, []));
    await apiClient.post('/x', { a: 1 });
    expect(fetchMock.mock.calls[0][1]).toEqual({
      method: 'POST',
      body: '{"a":1}',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('throws the backend message on errors, as before (now an ApiError with status and code)', async () => {
    getAccessToken.mockResolvedValue('tok');
    fetchMock.mockResolvedValue(json(403, { message: 'Verify your email address', code: 'EMAIL_NOT_VERIFIED' }));
    const error = (await apiClient.get('/x').catch((e: unknown) => e)) as InstanceType<typeof ApiError>;
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Verify your email address');
    expect(error.status).toBe(403);
    expect(error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('asks the auth client once after a 401 and does not retry when it returns null', async () => {
    getAccessToken.mockResolvedValue('old');
    handleUnauthorized.mockResolvedValue(null);
    fetchMock.mockResolvedValue(json(401, { message: 'Authentication required' }));
    await expect(apiClient.get('/x')).rejects.toThrow('Authentication required');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(handleUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('retries ONCE with the token the auth client hands out', async () => {
    getAccessToken.mockResolvedValue('old');
    handleUnauthorized.mockResolvedValue('new');
    fetchMock.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(401, { message: 'still' }));
    const response = await authorizedFetch('http://x/y', { method: 'POST' });
    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer new');
    expect(handleUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('multipart uploads get no Content-Type (the browser sets the boundary)', async () => {
    getAccessToken.mockResolvedValue('tok');
    fetchMock.mockResolvedValue(json(200, {}));
    const body = new FormData();
    await authorizedFetch('http://x/upload', { method: 'POST', body });
    expect(fetchMock.mock.calls[0][1]).toEqual({ method: 'POST', body, headers: { Authorization: 'Bearer tok' } });
  });
});
