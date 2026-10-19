import { Link, Outlet } from 'react-router';
import { StorageBanner } from './StorageBanner';

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 text-stone-900 antialiased">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <Link to="/" className="font-semibold">
          👗 Virtual Wardrobe
        </Link>
      </header>
      <StorageBanner />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
