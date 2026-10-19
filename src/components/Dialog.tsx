import { useEffect, type ReactNode } from 'react';

/** Centered modal. Listens for Escape in the capture phase so it closes before any Sheet beneath it. */
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} aria-hidden="true" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto border border-line2 border-t-[3px] border-t-accent bg-surface p-5 shadow-panel"
      >
        <h2 className="caps mb-3 text-2xl leading-tight">{title}</h2>
        {children}
      </section>
    </div>
  );
}
