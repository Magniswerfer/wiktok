import type { WikiCard, WikipediaSummaryResponse, WikipediaRelatedResponse, ImageAttribution } from './types';

const API_BASE = 'https://en.wikipedia.org/api/rest_v1';
const COMMONS_API_BASE = 'https://commons.wikimedia.org/w/api.php';
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

interface FetchOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable (network errors, 5xx, 429)
 */
function isRetryableError(error: unknown, response?: Response): boolean {
  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Timeout/abort errors are not retryable (user-initiated or timeout)
  if (error instanceof DOMException && error.name === 'AbortError') {
    return false;
  }

  // Check response status codes
  if (response) {
    // 429 Too Many Requests - retryable
    if (response.status === 429) return true;
    // 5xx Server errors - retryable
    if (response.status >= 500 && response.status < 600) return true;
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateBackoffDelay(attempt: number, baseDelayMs: number): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  // Add jitter (0-25% of delay) to prevent thundering herd
  const jitter = exponentialDelay * Math.random() * 0.25;
  // Cap at 30 seconds
  return Math.min(exponentialDelay + jitter, 30000);
}

function stripHtml(value: string | undefined): string {
  if (!value) return '';
  if (typeof document !== 'undefined') {
    const temp = document.createElement('div');
    temp.innerHTML = value;
    return (temp.textContent || '').replace(/\s+/g, ' ').trim();
  }
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function extractFilenameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const filename = path.substring(path.lastIndexOf('/') + 1);
    return filename ? decodeURIComponent(filename) : null;
  } catch {
    return null;
  }
}

function getMediaWikiApiBase(imageUrl: string, lang: string): string {
  if (imageUrl.includes('/commons/')) {
    return COMMONS_API_BASE;
  }
  return `https://${lang}.wikipedia.org/w/api.php`;
}

async function fetchImageAttribution(
  imageUrl: string,
  lang: string,
  options?: FetchOptions
): Promise<ImageAttribution | undefined> {
  const filename = extractFilenameFromUrl(imageUrl);
  if (!filename) return undefined;

  const apiBase = getMediaWikiApiBase(imageUrl, lang);
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    prop: 'imageinfo',
    iiprop: 'extmetadata|url',
    titles: `File:${filename}`
  });

  try {
    const response = await fetchWithTimeout(`${apiBase}?${params.toString()}`, {
      headers: { 'Accept': 'application/json' }
    }, options);

    if (!response.ok) return undefined;

    const data = await response.json();
    const pages = data?.query?.pages;
    const firstKey = pages ? Object.keys(pages)[0] : undefined;
    const page = firstKey ? pages[firstKey] : undefined;
    const info = page?.imageinfo?.[0];
    const ext = info?.extmetadata;

    if (!info || !ext) return undefined;

    const artist = stripHtml(ext.Artist?.value);
    const credit = stripHtml(ext.Credit?.value);
    const attribution = stripHtml(ext.Attribution?.value);
    const license = stripHtml(ext.LicenseShortName?.value || ext.UsageTerms?.value);
    const licenseUrl = ext.LicenseUrl?.value;

    return {
      artist: artist || undefined,
      credit: credit || undefined,
      attribution: attribution || undefined,
      license: license || undefined,
      licenseUrl: licenseUrl || undefined,
      filePageUrl: info.descriptionurl,
      sourceUrl: info.url
    };
  } catch (error) {
    console.warn('Failed to fetch image attribution:', error);
    return undefined;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, options?: FetchOptions): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  if (options?.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Fetch with timeout and exponential backoff retry
 */
async function fetchWithRetry(url: string, init: RequestInit, options?: FetchOptions): Promise<Response> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

  let lastError: unknown;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check if we're offline before attempting
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('No network connection');
    }

    // Check if aborted before attempting
    if (options?.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      const response = await fetchWithTimeout(url, init, options);

      // Success - return response
      if (response.ok) {
        return response;
      }

      // Non-retryable error status
      if (!isRetryableError(null, response)) {
        return response; // Let caller handle the error
      }

      lastResponse = response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;

      // Don't retry non-retryable errors
      if (!isRetryableError(error)) {
        throw error;
      }
    }

    // Don't delay after last attempt
    if (attempt < maxRetries) {
      const delay = calculateBackoffDelay(attempt, baseDelayMs);
      console.warn(`Fetch attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }

  // All retries exhausted
  if (lastResponse) {
    return lastResponse; // Return last response for caller to handle
  }
  throw lastError;
}

/**
 * Convert Wikipedia API response to our WikiCard format
 */
async function responseToCard(response: WikipediaSummaryResponse, options?: FetchOptions): Promise<WikiCard> {
  const imageUrl = response.originalimage?.source ?? response.thumbnail?.source;
  const imageAttribution = imageUrl
    ? await fetchImageAttribution(imageUrl, response.lang, options)
    : undefined;

  return {
    id: `${response.lang}:${response.pageid}`,
    lang: response.lang,
    title: response.title,
    extract: response.extract,
    url: response.content_urls.desktop.page,
    thumbnailUrl: response.thumbnail?.source,
    imageAttribution,
    pageid: response.pageid,
    fetchedAt: Date.now(),
    source: {
      name: "Wikipedia",
      license: "CC BY-SA 4.0",
      attributionText: `"${response.title}" from Wikipedia, the free encyclopedia`
    }
  };
}

/**
 * Fetch a random Wikipedia article summary
 */
export async function fetchRandomSummary(options?: FetchOptions): Promise<WikiCard> {
  const response = await fetchWithRetry(`${API_BASE}/page/random/summary`, {
    headers: {
      'Accept': 'application/json',
      'Api-User-Agent': 'WikiTok/1.0 (https://github.com/wikitok; contact@wikitok.app)'
    }
  }, options);

  if (!response.ok) {
    throw new Error(`Failed to fetch random summary: ${response.status}`);
  }

  const data: WikipediaSummaryResponse = await response.json();
  return responseToCard(data, options);
}

/**
 * Fetch summary for a specific article title
 */
export async function fetchSummaryByTitle(title: string, options?: FetchOptions): Promise<WikiCard> {
  const encodedTitle = encodeURIComponent(title);
  const response = await fetchWithRetry(`${API_BASE}/page/summary/${encodedTitle}`, {
    headers: {
      'Accept': 'application/json',
      'Api-User-Agent': 'WikiTok/1.0 (https://github.com/wikitok; contact@wikitok.app)'
    }
  }, options);

  if (!response.ok) {
    throw new Error(`Failed to fetch summary for "${title}": ${response.status}`);
  }

  const data: WikipediaSummaryResponse = await response.json();
  return responseToCard(data, options);
}

/**
 * Fetch related pages for a given title
 */
export async function fetchRelatedPages(title: string, options?: FetchOptions): Promise<WikiCard[]> {
  const encodedTitle = encodeURIComponent(title);
  const response = await fetchWithRetry(`${API_BASE}/page/related/${encodedTitle}`, {
    headers: {
      'Accept': 'application/json',
      'Api-User-Agent': 'WikiTok/1.0 (https://github.com/wikitok; contact@wikitok.app)'
    }
  }, options);

  if (!response.ok) {
    // Related pages may not be available for all articles
    if (response.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch related pages for "${title}": ${response.status}`);
  }

  const data: WikipediaRelatedResponse = await response.json();
  return Promise.all(data.pages.map(page => responseToCard(page, options)));
}

/**
 * Fetch multiple random summaries
 */
export async function fetchRandomSummaries(count: number, options?: FetchOptions): Promise<WikiCard[]> {
  const promises = Array(count).fill(null).map(() => fetchRandomSummary(options));
  const results = await Promise.allSettled(promises);

  const cards: WikiCard[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      cards.push(result.value);
    }
  }

  if (cards.length === 0) {
    throw new Error('Failed to fetch summaries');
  }

  return cards;
}
