import { useState } from 'react';

type Theme = 'dark' | 'light';

const THEME_KEY = 'virtual-wardrobe:theme';
const THEME_COLOR: Record<Theme, string> = { dark: '#141516', light: '#f1efea' };

/** index.html applies the saved theme before first paint; this keeps it in sync afterwards. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
  );
  const next: Theme = theme === 'dark' ? 'light' : 'dark';

  function toggle() {
    document.documentElement.dataset.theme = next;
    document.querySelector<HTMLMetaElement>('meta[name=theme-color]')?.setAttribute('content', THEME_COLOR[next]);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage unavailable: the theme just won't be remembered.
    }
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      className="flex h-9 w-9 items-center justify-center border border-line2 text-text2 transition hover:border-line3 hover:text-text"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
