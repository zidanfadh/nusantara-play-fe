import { MapPinned } from 'lucide-react';
import { JELAJAH_LOGIN_NOTICE, type LoginReason } from './login-redirect';

/** Why the visitor landed on the login page (Phase 18). Only `reason=jelajah` has a notice. */
export function LoginNotice({ reason }: { reason: LoginReason | null }) {
  if (reason !== 'jelajah') return null;
  return (
    <div
      role="status"
      data-login-notice="jelajah"
      className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-foreground"
    >
      <MapPinned aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <p>{JELAJAH_LOGIN_NOTICE}</p>
    </div>
  );
}
