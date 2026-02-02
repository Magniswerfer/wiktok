import type { WikiCard, WikipediaSummaryResponse, WikipediaRelatedResponse } from './types';

const API_BASE = 'https://en.wikipedia.org/api/rest_v1';

/**
 * Convert Wikipedia API response to our WikiCard format
 */
function responseToCard(response: WikipediaSummaryResponse): WikiCard {
  return {
    id: `${response.lang}:${response.pageid}`,
    lang: response.lang,
    title: response.title,
    extract: response.extract,
    url: response.content_urls.desktop.page,
    thumbnailUrl: response.thumbnail?.source,
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
export async function fetchRandomSummary(): Promise<WikiCard> {
  const response = await fetch(`${API_BASE}/page/random/summary`, {
    headers: {
      'Accept': 'application/json',
      'Api-User-Agent': 'WikiTok/1.0 (https://github.com/wikitok; contact@wikitok.app)'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch random summary: ${response.status}`);
  }

  const data: WikipediaSummaryResponse = await response.json();
  return responseToCard(data);
}

/**
 * Fetch summary for a specific article title
 */
export async function fetchSummaryByTitle(title: string): Promise<WikiCard> {
  const encodedTitle = encodeURIComponent(title);
  const response = await fetch(`${API_BASE}/page/summary/${encodedTitle}`, {
    headers: {
      'Accept': 'application/json',
      'Api-User-Agent': 'WikiTok/1.0 (https://github.com/wikitok; contact@wikitok.app)'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch summary for "${title}": ${response.status}`);
  }

  const data: WikipediaSummaryResponse = await response.json();
  return responseToCard(data);
}

/**
 * Fetch related pages for a given title
 */
export async function fetchRelatedPages(title: string): Promise<WikiCard[]> {
  const encodedTitle = encodeURIComponent(title);
  const response = await fetch(`${API_BASE}/page/related/${encodedTitle}`, {
    headers: {
      'Accept': 'application/json',
      'Api-User-Agent': 'WikiTok/1.0 (https://github.com/wikitok; contact@wikitok.app)'
    }
  });

  if (!response.ok) {
    // Related pages may not be available for all articles
    if (response.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch related pages for "${title}": ${response.status}`);
  }

  const data: WikipediaRelatedResponse = await response.json();
  return data.pages.map(responseToCard);
}

/**
 * Fetch multiple random summaries
 */
export async function fetchRandomSummaries(count: number): Promise<WikiCard[]> {
  const promises = Array(count).fill(null).map(() => fetchRandomSummary());
  const results = await Promise.allSettled(promises);

  const cards: WikiCard[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      cards.push(result.value);
    }
  }

  return cards;
}
