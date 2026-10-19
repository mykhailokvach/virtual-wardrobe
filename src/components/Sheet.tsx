import { useEffect, type ReactNode } from 'react';
import { Button } from './Button';

/** Bottom sheet on phones, right-hand panel from the `md` breakpoint. */
export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} aria-hidden="true" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col border-t-[3px] border-t-accent bg-surface shadow-panel md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[420px] md:border-t-0 md:border-l md:border-l-line2"
      >
        <header className="flex items-center justify-between gap-2 border-b border-line py-1 pr-1 pl-4">
          <h2 className="caps truncate text-lg">{title}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <footer className="border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</footer>
        )}
      </section>
    </div>
  );
}
