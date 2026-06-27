import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveBackendApiUrl } from '../../lib/api/base-url';

describe('resolveBackendApiUrl', () => {
  it('uses NEXT_PUBLIC_BACKEND_API_URL in development', () => {
    const result = resolveBackendApiUrl({
      nodeEnv: 'development',
      envBackendApiUrl: 'http://localhost:3000/api',
      hostname: 'nusantaralegacy.org',
    });

    assert.equal(result, 'http://localhost:3000/api');
  });

  it('resolves nusantaralegacy.org to its production API host', () => {
    const result = resolveBackendApiUrl({
      nodeEnv: 'production',
      envBackendApiUrl: 'http://localhost:3000/api',
      hostname: 'nusantaralegacy.org',
    });

    assert.equal(result, 'https://api.nusantaralegacy.org/api');
  });

  it('resolves nusantaravirtual.org to its production API host', () => {
    const result = resolveBackendApiUrl({
      nodeEnv: 'production',
      envBackendApiUrl: 'http://localhost:3000/api',
      hostname: 'nusantaravirtual.org',
    });

    assert.equal(result, 'https://api.nusantaravirtual.org/api');
  });

  it('normalizes www hostnames before resolving production API host', () => {
    const result = resolveBackendApiUrl({
      nodeEnv: 'production',
      envBackendApiUrl: 'http://localhost:3000/api',
      hostname: 'www.nusantaravirtual.org',
    });

    assert.equal(result, 'https://api.nusantaravirtual.org/api');
  });

  it('falls back to NEXT_PUBLIC_BACKEND_API_URL when hostname is unavailable', () => {
    const result = resolveBackendApiUrl({
      nodeEnv: 'production',
      envBackendApiUrl: 'https://fallback.example.com/api',
    });

    assert.equal(result, 'https://fallback.example.com/api');
  });

  it('treats missing NODE_ENV as production', () => {
    const result = resolveBackendApiUrl({
      envBackendApiUrl: 'https://fallback.example.com/api',
      hostname: 'nusantaralegacy.org',
    });

    assert.equal(result, 'https://api.nusantaralegacy.org/api');
  });
});
