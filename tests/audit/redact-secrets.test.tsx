import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AuditChangesDisplay } from '@/components/audit/AuditChangesDisplay';
import { isSecretKey, REDACTED, redactSecrets } from '@/components/audit/redact-secrets';

describe('isSecretKey (Phase 07)', () => {
  it.each([
    'password',
    'currentPassword',
    'new_password',
    'PASSWORD',
    'token',
    'accessToken',
    'refresh_token',
    'secret',
    'clientSecret',
    'apikey',
    'apiKey',
    'api_key',
    'X-API-KEY',
    'authorization',
    'Authorization',
  ])('%s is a secret key', (key) => {
    expect(isSecretKey(key)).toBe(true);
  });

  it.each(['email', 'full_name', 'role', 'status', 'description', 'id'])(
    '%s is not a secret key',
    (key) => {
      expect(isSecretKey(key)).toBe(false);
    },
  );
});

describe('redactSecrets (Phase 07)', () => {
  it('redacts secret keys at any nesting level, including inside arrays', () => {
    const input = {
      email: 'a@example.test',
      password: 'hunter2',
      profile: {
        name: 'A',
        credentials: { apiKey: 'k-123', nested: { Authorization: 'Bearer x' } },
      },
      sessions: [{ refresh_token: 'r-1', device: 'phone' }],
    };
    expect(redactSecrets(input)).toEqual({
      email: 'a@example.test',
      password: REDACTED,
      profile: {
        name: 'A',
        credentials: { apiKey: REDACTED, nested: { Authorization: REDACTED } },
      },
      sessions: [{ refresh_token: REDACTED, device: 'phone' }],
    });
  });

  it('redacts a secret key even when its value is an object', () => {
    expect(redactSecrets({ secret: { a: 1 } })).toEqual({ secret: REDACTED });
  });

  it('does not modify the input', () => {
    const input = { password: 'hunter2', nested: { token: 't' } };
    redactSecrets(input);
    expect(input).toEqual({ password: 'hunter2', nested: { token: 't' } });
  });

  it('handles primitives, null and circular structures', () => {
    expect(redactSecrets(null)).toBeNull();
    expect(redactSecrets('text')).toBe('text');
    const circular: Record<string, unknown> = { name: 'loop' };
    circular.self = circular;
    expect(redactSecrets(circular)).toEqual({ name: 'loop', self: REDACTED });
  });
});

describe('AuditChangesDisplay never shows secret values (Phase 07)', () => {
  const SECRETS = ['hunter2', 'tok-abc', 'sk-live-999', 'Bearer abc.def'];
  const changes = {
    full_name: 'DEMO User',
    password: 'hunter2',
    profile: { accessToken: 'tok-abc', settings: { api_key: 'sk-live-999' } },
    headers: [{ authorization: 'Bearer abc.def' }],
  };

  it.each(['CREATE', 'UPDATE', 'DELETE', 'UPDATE_PROFILE'] as const)(
    'action %s',
    (action) => {
      const html = renderToStaticMarkup(
        <AuditChangesDisplay changes={changes} action={action} />,
      );
      expect(html).toContain('DEMO User');
      expect(html).toContain(REDACTED);
      for (const secret of SECRETS) {
        expect(html).not.toContain(secret);
      }
    },
  );

  it('change-password rows still show only the summary', () => {
    const html = renderToStaticMarkup(
      <AuditChangesDisplay
        changes={{ currentPassword: 'old-secret', newPassword: 'new-secret' }}
        action="CHANGE_PASSWORD"
      />,
    );
    expect(html).toContain('Password Diubah');
    expect(html).not.toContain('old-secret');
    expect(html).not.toContain('new-secret');
  });
});
