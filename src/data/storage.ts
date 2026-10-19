/** Returns false when IndexedDB is unusable (e.g. some private-browsing modes). */
export async function probeStorage(): Promise<boolean> {
  try {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('virtual-wardrobe-probe');
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return false;
  }
  // Ask the browser not to evict our data under storage pressure (best effort).
  navigator.storage?.persist?.().catch(() => {});
  return true;
}
