import { Link, Outlet } from 'react-router';
import { StorageBanner } from './StorageBanner';
import { ThemeToggle } from './ThemeToggle';

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text antialiased">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-bg px-4 pt-[env(safe-area-inset-top)]">
        <Link to="/" className="caps flex h-14 items-center gap-2.5 text-lg tracking-[0.06em] text-text">
          <span aria-hidden="true" className="relative h-5 w-4 border-2 border-text">
            <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-accent" />
          </span>
          Virtual Wardrobe
        </Link>
        <ThemeToggle />
      </header>
      <StorageBanner />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
