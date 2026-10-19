import { useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

/** A button that opens the image picker. On phones, `accept="image/*"` offers both camera and gallery. */
export function ImagePickerButton({
  onPick,
  multiple = false,
  className,
  children,
  ...buttonProps
}: {
  onPick: (files: File[]) => void;
  multiple?: boolean;
  className?: string;
  children: ReactNode;
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'disabled'>) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={(event) => {
          event.stopPropagation();
          inputRef.current?.click();
        }}
        {...buttonProps}
      >
        {children}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = ''; // allow picking the same file again
          if (files.length > 0) onPick(files);
        }}
      />
    </>
  );
}
