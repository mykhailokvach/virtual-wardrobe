import { useEffect, useState } from 'react';
import { probeStorage } from '../data/storage';

export function StorageBanner() {
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let active = true;
    probeStorage().then((ok) => {
      if (active) setAvailable(ok);
    });
    return () => {
      active = false;
    };
  }, []);

  if (available) return null;
  return (
    <p role="alert" className="bg-amber-100 px-4 py-2 text-sm text-amber-900">
      Your browser is blocking storage, so wardrobes won't be saved. Try leaving private browsing mode.
    </p>
  );
}
