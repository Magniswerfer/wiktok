import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchRandomSummary, fetchSummaryByTitle, fetchRelatedPages } from './wikipedia';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock navigator.onLine
let mockOnline = true;
Object.defineProperty(navigator, 'onLine', {
  get: () => mockOnline,
  configurable: true,
});

const mockWikipediaResponse = {
  type: 'standard',
  title: 'Test Article',
  displaytitle: 'Test Article',
  namespace: { id: 0, text: '' },
  wikibase_item: 'Q123',
  titles: { canonical: 'Test_Article', normalized: 'Test Article', display: 'Test Article' },
  pageid: 12345,
  thumbnail: { source: 'https://upload.wikimedia.org/test.jpg', width: 100, height: 100 },
  lang: 'en',
  dir: 'ltr',
  revision: '123456',
  tid: 'abc123',
  timestamp: '2024-01-01T00:00:00Z',
  description: 'A test article',
  content_urls: {
    desktop: { page: 'https://en.wikipedia.org/wiki/Test_Article', revisions: '', edit: '', talk: '' },
    mobile: { page: 'https://en.m.wikipedia.org/wiki/Test_Article', revisions: '', edit: '', talk: '' },
  },
  extract: 'This is a test article extract.',
  extract_html: '<p>This is a test article extract.</p>',
};

const mockImageInfoResponse = {
  query: {
    pages: {
      1: {
        imageinfo: [
          {
            url: 'https://upload.wikimedia.org/test.jpg',
            descriptionurl: 'https://commons.wikimedia.org/wiki/File:Test.jpg',
            extmetadata: {
              Artist: { value: 'Test Artist' },
              LicenseShortName: { value: 'CC BY-SA 4.0' },
              LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' }
            }
          }
        ]
      }
    }
  }
};

describe('Wikipedia API with Retry Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockOnline = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('fetchRandomSummary', () => {
    it('should return a WikiCard on successful fetch', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWikipediaResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockImageInfoResponse),
        });

      const promise = fetchRandomSummary({ maxRetries: 0 });
      await vi.runAllTimersAsync();
      const card = await promise;

      expect(card.title).toBe('Test Article');
      expect(card.extract).toBe('This is a test article extract.');
      expect(card.source.license).toBe('CC BY-SA 4.0');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 server error', async () => {
      // First call fails with 500, second succeeds
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWikipediaResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockImageInfoResponse),
        });

      const promise = fetchRandomSummary({ maxRetries: 3, baseDelayMs: 100 });

      // Run timers to allow retries
      await vi.runAllTimersAsync();
      const card = await promise;

      expect(card.title).toBe('Test Article');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should retry on 429 rate limit', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWikipediaResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockImageInfoResponse),
        });

      const promise = fetchRandomSummary({ maxRetries: 3, baseDelayMs: 100 });
      await vi.runAllTimersAsync();
      const card = await promise;

      expect(card.title).toBe('Test Article');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should NOT retry on 404 error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const promise = fetchRandomSummary({ maxRetries: 3, baseDelayMs: 100 });
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('Failed to fetch random summary: 404');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and throw on persistent failure', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503 });

      const promise = fetchRandomSummary({ maxRetries: 2, baseDelayMs: 100 });
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('Failed to fetch random summary: 503');
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Offline Handling', () => {
    it('should throw immediately when offline', async () => {
      mockOnline = false;

      const promise = fetchRandomSummary({ maxRetries: 3 });
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('No network connection');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Abort Signal Handling', () => {
    it('should abort fetch when signal is aborted', async () => {
      const controller = new AbortController();

      mockFetch.mockImplementation(() => new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }));

      const promise = fetchRandomSummary({ signal: controller.signal });
      controller.abort();

      await expect(promise).rejects.toThrow();
    });

    it('should not retry on abort error', async () => {
      mockFetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

      const promise = fetchRandomSummary({ maxRetries: 3, baseDelayMs: 100 });
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchSummaryByTitle', () => {
    it('should fetch article by title', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWikipediaResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockImageInfoResponse),
        });

      const promise = fetchSummaryByTitle('Test Article', { maxRetries: 0 });
      await vi.runAllTimersAsync();
      const card = await promise;

      expect(card.title).toBe('Test Article');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/page/summary/Test%20Article'),
        expect.any(Object)
      );
    });
  });

  describe('fetchRelatedPages', () => {
    it('should return empty array on 404', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const promise = fetchRelatedPages('Test Article', { maxRetries: 0 });
      await vi.runAllTimersAsync();
      const cards = await promise;

      expect(cards).toEqual([]);
    });

    it('should return related pages on success', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ pages: [mockWikipediaResponse, mockWikipediaResponse] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockImageInfoResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockImageInfoResponse),
        });

      const promise = fetchRelatedPages('Test Article', { maxRetries: 0 });
      await vi.runAllTimersAsync();
      const cards = await promise;

      expect(cards).toHaveLength(2);
      expect(cards[0].title).toBe('Test Article');
    });
  });

});

