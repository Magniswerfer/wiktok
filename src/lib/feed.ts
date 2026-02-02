import type { WikiCard } from './types';
import { fetchRandomSummaries, fetchRelatedPages } from './wikipedia';
import { loadCachedCards, saveCachedCards, addToCache } from './cache';

const PREFETCH_THRESHOLD = 3; // Start prefetching when this many cards remain
const INITIAL_FETCH_COUNT = 10;
const PREFETCH_COUNT = 5;

export type FeedCallback = (cards: WikiCard[], isLoading: boolean, error: string | null) => void;

/**
 * Feed Manager - handles the card queue and prefetching
 */
class FeedManager {
  private cards: WikiCard[] = [];
  private seenIds: Set<string> = new Set();
  private isLoading: boolean = false;
  private error: string | null = null;
  private callbacks: Set<FeedCallback> = new Set();
  private topicMode: boolean = false;
  private currentTopicTitle: string | null = null;

  constructor() {
    // Load cached cards on init
    const cached = loadCachedCards();
    if (cached.length > 0) {
      this.cards = cached;
      cached.forEach(c => this.seenIds.add(c.id));
    }
  }

  /**
   * Subscribe to feed updates
   */
  subscribe(callback: FeedCallback): () => void {
    this.callbacks.add(callback);
    // Immediately notify with current state
    callback(this.cards, this.isLoading, this.error);
    return () => this.callbacks.delete(callback);
  }

  private notify(): void {
    this.callbacks.forEach(cb => cb(this.cards, this.isLoading, this.error));
  }

  /**
   * Get all cards
   */
  getCards(): WikiCard[] {
    return this.cards;
  }

  /**
   * Get loading state
   */
  getIsLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Initialize the feed
   */
  async initialize(): Promise<void> {
    if (this.cards.length === 0) {
      await this.fetchMore(INITIAL_FETCH_COUNT);
    }
  }

  /**
   * Fetch more cards
   */
  async fetchMore(count: number = PREFETCH_COUNT): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      let newCards: WikiCard[];

      if (this.topicMode && this.currentTopicTitle) {
        // Fetch related pages in topic mode
        newCards = await fetchRelatedPages(this.currentTopicTitle);
        if (newCards.length === 0) {
          // Fallback to random if no related pages
          newCards = await fetchRandomSummaries(count);
        }
      } else {
        // Fetch random pages
        newCards = await fetchRandomSummaries(count);
      }

      // Filter out duplicates
      const uniqueCards = newCards.filter(c => !this.seenIds.has(c.id));
      uniqueCards.forEach(c => this.seenIds.add(c.id));

      this.cards = [...this.cards, ...uniqueCards];

      // Update cache
      addToCache(uniqueCards);

    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to fetch articles';
      console.error('Feed fetch error:', e);
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /**
   * Check if more cards should be prefetched based on current index
   */
  maybePreFetch(currentIndex: number): void {
    const remaining = this.cards.length - currentIndex - 1;
    if (remaining <= PREFETCH_THRESHOLD && !this.isLoading) {
      this.fetchMore();
    }
  }

  /**
   * Enable topic mode for a specific title
   */
  enableTopicMode(title: string): void {
    this.topicMode = true;
    this.currentTopicTitle = title;
    this.fetchMore();
  }

  /**
   * Disable topic mode
   */
  disableTopicMode(): void {
    this.topicMode = false;
    this.currentTopicTitle = null;
  }

  /**
   * Check if topic mode is active
   */
  isTopicModeActive(): boolean {
    return this.topicMode;
  }

  /**
   * Clear feed and reload
   */
  async refresh(): Promise<void> {
    this.cards = [];
    this.seenIds.clear();
    this.error = null;
    this.topicMode = false;
    this.currentTopicTitle = null;
    saveCachedCards([]);
    this.notify();
    await this.fetchMore(INITIAL_FETCH_COUNT);
  }

  /**
   * Get card at index
   */
  getCardAt(index: number): WikiCard | null {
    return this.cards[index] ?? null;
  }

  /**
   * Get total card count
   */
  getCardCount(): number {
    return this.cards.length;
  }
}

// Singleton instance
export const feedManager = new FeedManager();
