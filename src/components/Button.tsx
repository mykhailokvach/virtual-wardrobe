import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent shadow-[inset_0_-2px_0_var(--accent-edge)] hover:bg-accent-hover',
  secondary: 'border border-line2 text-text hover:border-line3 hover:bg-plate',
  danger: 'border border-line2 text-danger hover:border-danger',
  ghost: 'text-muted hover:text-text',
};

/** Shared so links can look like buttons. min-h-11 keeps a 44px touch target. */
export function buttonClass(variant: Variant = 'primary', extra = ''): string {
  return `caps inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm transition disabled:opacity-40 ${variants[variant]} ${extra}`;
}

/** One option of a segmented control; place options side by side inside `segmentGroupClass`. */
export function segmentClass(selected: boolean): string {
  return `caps min-h-10 flex-1 px-3 text-xs transition not-first:border-l not-first:border-line2 ${
    selected ? 'bg-inv text-on-inv' : 'text-muted hover:text-text'
  }`;
}

export const segmentGroupClass = 'flex border border-line2';

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
