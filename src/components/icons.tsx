import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

/**
 * 24×24 line icons drawn with square caps and mitred joins to match the angular UI.
 * They inherit `currentColor` and are decorative (aria-hidden): the surrounding control
 * carries the accessible name. Size them with Tailwind, e.g. `className="h-5 w-5"`.
 */
function Icon({ children, className = 'h-5 w-5', ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {children}
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </Icon>
  );
}

/** Two boxes snapped to shared guide lines: the "align sections" action. */
export function AlignIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 2v20M20 2v20" strokeDasharray="2 2" />
      <path d="M8 5h8v5H8zM8 14h8v5H8z" />
    </Icon>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" />
    </Icon>
  );
}

/** A T-shirt: stands for the "clothes" item type. */
export function ShirtIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 3 3 6l2 5 2-1v11h10V10l2 1 2-5-6-3c0 1.7-1.3 3-3 3S9 4.7 9 3Z" />
    </Icon>
  );
}

/** A sneaker in side view: stands for the "shoes" item type. */
export function ShoeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 18V7h5l2 4h4l7 3c1.3.5 2 1.5 2 2.8V18H2Z" />
      <path d="M2 15h20M11 11l1-2M14 12l1-2" />
    </Icon>
  );
}
