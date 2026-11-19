'use client';

import { useEffect } from 'react';
import { placeToasts, resetToastPlacement } from './toast-clearance';

/**
 * Keeps the site-wide top-centre toasts clear of the Jelajah overlays marked `data-toast-avoid` (Phase 13):
 * measured on mount, on resize and whenever `layoutKey` changes (an overlay opened or closed); back to the
 * site default when the page unmounts. Toast helpers also call `placeToasts()` right before showing a toast.
 */
export function useToastClearance(layoutKey: unknown): void {
  useEffect(() => {
    placeToasts();
  }, [layoutKey]);

  useEffect(() => {
    window.addEventListener('resize', placeToasts);
    return () => {
      window.removeEventListener('resize', placeToasts);
      resetToastPlacement();
    };
  }, []);
}
