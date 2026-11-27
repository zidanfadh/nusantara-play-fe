/**
 * Sign-in / sign-out between the tabs of one browser (Phase 29). BroadcastChannel when available, otherwise
 * the `storage` event of a localStorage key. Only the event type travels: NEVER a token, user or email.
 */

export type TabMessage = 'signed-in' | 'signed-out';

export const TAB_CHANNEL = 'np-auth-v1';
export const TAB_STORAGE_KEY = 'np_auth_event_v1';

export interface TabChannel {
  post(message: TabMessage): void;
  close(): void;
}

export interface TabChannelEnv {
  BroadcastChannel?: typeof BroadcastChannel;
  localStorage?: Pick<Storage, 'setItem'>;
  addEventListener?: (type: 'storage', listener: (event: StorageEvent) => void) => void;
  removeEventListener?: (type: 'storage', listener: (event: StorageEvent) => void) => void;
}

function isTabMessage(value: unknown): value is TabMessage {
  return value === 'signed-in' || value === 'signed-out';
}

export function openTabChannel(env: TabChannelEnv, onMessage: (message: TabMessage) => void): TabChannel {
  if (typeof env.BroadcastChannel === 'function') {
    try {
      const channel = new env.BroadcastChannel(TAB_CHANNEL);
      channel.onmessage = (event: MessageEvent) => {
        const type = (event.data as { type?: unknown } | null)?.type;
        if (isTabMessage(type)) onMessage(type);
      };
      return {
        post: (message) => channel.postMessage({ type: message }),
        close: () => channel.close(),
      };
    } catch {
      // fall through to the storage event
    }
  }

  const listener = (event: StorageEvent) => {
    if (event.key !== TAB_STORAGE_KEY || !event.newValue) return;
    const type = event.newValue.split(':')[0];
    if (isTabMessage(type)) onMessage(type);
  };
  env.addEventListener?.('storage', listener);
  let counter = 0;
  return {
    post: (message) => {
      try {
        // A new value every time, otherwise the same message twice in a row fires no storage event.
        env.localStorage?.setItem(TAB_STORAGE_KEY, `${message}:${Date.now()}:${counter++}`);
      } catch {
        // storage unavailable: other tabs notice on their next refresh
      }
    },
    close: () => env.removeEventListener?.('storage', listener),
  };
}
