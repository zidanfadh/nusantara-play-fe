'use client';

import { useSyncExternalStore } from 'react';
import type { ThemeMode } from './palette';

// The site toggles the theme with the `dark` class on <html> (app/layout.tsx, AnimatedThemeToggler).
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

function getSnapshot(): ThemeMode {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function getServerSnapshot(): ThemeMode {
  return 'light';
}

export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
