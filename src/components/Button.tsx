import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variants: Record<Variant, string> = {
  primary: 'bg-stone-900 text-white hover:bg-stone-700',
  secondary: 'bg-white text-stone-900 ring-1 ring-stone-300 hover:bg-stone-100',
  danger: 'bg-red-600 text-white hover:bg-red-500',
  ghost: 'text-stone-700 hover:bg-stone-100',
};

/** Shared so links can look like buttons. min-h-11 keeps a 44px touch target. */
export function buttonClass(variant: Variant = 'primary', extra = ''): string {
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition disabled:opacity-50 ${variants[variant]} ${extra}`;
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
