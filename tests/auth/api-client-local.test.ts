/**
 * Phase 29 step 2: `apiClient` in local mode: same-origin /backend-api, credentials, the CSRF header, Bearer;
 * a 401 asks the auth client for ONE refresh and retries ONCE; 403 EMAIL_NOT_VERIFIED fires the window event.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubEnv('NEXT_PUBLIC_AUTH_MODE', 'local');
vi.stubEnv('NODE_ENV', 'development');
vi.stubEnv('NEXT_PUBLIC_BACKEND_API_URL', 'http://localhost:3000/api');

const getAccessToken = vi.fn();
const handleUnauthorized = vi.fn();
vi.mock('@/lib/auth/client', () => ({
  authClient: {
    mode: 'local',
    getAccessToken: () => getAccessToken(),
    handleUnauthorized: () => handleUnauthorized(),
  },
}));

const fetchMock = vi.fn();
const dispatched: string[] = [];
const fakeWindow = {
  location: { origin: 'http://localhost:3001' },
  dispatchEvent: (event: Event) => dispatched.push(event.type),
};
vi.stubGlobal('window', fakeWindow);

const { apiClient, EMAIL_NOT_VERIFIED_EVENT } = await import('@/lib/api/client');

beforeEach(() => {
  fetchMock.mockReset();
  getAccessToken.mockReset();
  handleUnauthorized.mockReset();
  dispatched.length = 0;
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('window', fakeWindow);
});
afterEach(() => vi.unstubAllGlobals());

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe('apiClient in local mode', () => {
  it('calls the same-origin proxy with credentials, the CSRF header and the Bearer token', async () => {
    getAccessToken.mockResolvedValue('t1');
    fetchMock.mockResolvedValue(json(200, { id: 'u' }));
    await apiClient.get('/users/me');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3001/backend-api/users/me');
    expect(init).toEqual({
      credentials: 'include',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'nusantara-play',
        Authorization: 'Bearer t1',
      },
    });
  });

  it('401 → one refresh → one retry with the new token', async () => {
    getAccessToken.mockResolvedValue('old');
    handleUnauthorized.mockResolvedValue('new');
    fetchMock.mockResolvedValueOnce(json(401, { message: 'Unauthorized' })).mockResolvedValueOnce(json(200, { ok: true }));
    expect(await apiClient.post('/rewards/activities', { type: 'PROT_VIEW' })).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer new');
    expect(fetchMock.mock.calls[1][1].body).toBe('{"type":"PROT_VIEW"}');
  });

  it('a second 401 is not retried again', async () => {
    getAccessToken.mockResolvedValue('old');
    handleUnauthorized.mockResolvedValue('new');
    fetchMock.mockResolvedValue(json(401, { message: 'Unauthorized' }));
    await expect(apiClient.get('/users/me')).rejects.toThrow('Unauthorized');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(handleUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('403 EMAIL_NOT_VERIFIED fires the notice event and still throws', async () => {
    getAccessToken.mockResolvedValue('t1');
    fetchMock.mockResolvedValue(json(403, { code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email address' }));
    await expect(apiClient.get('/rewards/redeem')).rejects.toMatchObject({ status: 403, code: 'EMAIL_NOT_VERIFIED' });
    expect(dispatched).toEqual([EMAIL_NOT_VERIFIED_EVENT]);
  });
});
