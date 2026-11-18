'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * Modal dialog of the simulated reward UI (Phase 12), built on the native <dialog> with showModal():
 * the browser traps the focus, makes the page behind it inert and closes it with Esc. The focus goes
 * back to the element that opened it.
 */
export function DemoDialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onNativeClose = () => {
      const el = returnFocus.current;
      returnFocus.current = null;
      if (el?.isConnected) el.focus();
      onClose();
    };
    dialog.addEventListener('close', onNativeClose);
    return () => dialog.removeEventListener('close', onNativeClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="m-auto max-h-[85dvh] w-[min(92vw,40rem)] overflow-hidden rounded-2xl border border-border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/50"
      onClick={(e) => {
        // A click on the backdrop (outside the content box) closes the dialog.
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-start gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg font-bold leading-snug">
                {title}
              </h2>
              {subtitle && <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>}
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Tutup"
              autoFocus
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
          {footer && <div className="border-t border-border px-4 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
