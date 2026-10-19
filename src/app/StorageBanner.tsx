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
    <p role="alert" className="border-b border-line border-l-[3px] border-l-accent bg-row-sel px-4 py-2 text-sm text-text2">
      Your browser is blocking storage, so wardrobes won't be saved. Try leaving private browsing mode.
    </p>
  );
}
