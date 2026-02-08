const MAX_TRACKED_IMAGE_URLS = 300;

const loadedUrls = new Set<string>();
const loadOrder: string[] = [];

function evictOldestIfNeeded(): void {
  while (loadOrder.length > MAX_TRACKED_IMAGE_URLS) {
    const oldest = loadOrder.shift();
    if (!oldest) break;
    loadedUrls.delete(oldest);
  }
}

export function markUrlAsLoaded(url: string): void {
  if (!url) return;
  if (loadedUrls.has(url)) return;

  loadedUrls.add(url);
  loadOrder.push(url);
  evictOldestIfNeeded();
}

export function isUrlLoaded(url: string): boolean {
  return loadedUrls.has(url);
}

export function __resetUrlLoadCacheForTests(): void {
  loadedUrls.clear();
  loadOrder.length = 0;
}

export function __getTrackedUrlCountForTests(): number {
  return loadOrder.length;
}
