import type { WikiCard, AppSettings } from './types';

const CACHE_KEY = 'wikitok_cache';
const SETTINGS_KEY = 'wikitok_settings';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CacheData {
  cards: WikiCard[];
  timestamp: number;
}

/**
 * Get default app settings
 */
export function getDefaultSettings(): AppSettings {
  return {
    audioUnlocked: false,
    ttsRate: 1.0,
    ttsVoice: null,
    topicMode: false
  };
}

/**
 * Load settings from localStorage
 */
export function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...getDefaultSettings(), ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to load settings:', e);
  }
  return getDefaultSettings();
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}

/**
 * Load cached cards from localStorage
 */
export function loadCachedCards(): WikiCard[] {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const data: CacheData = JSON.parse(stored);
      // Check if cache is still valid
      if (Date.now() - data.timestamp < CACHE_TTL) {
        return data.cards;
      }
    }
  } catch (e) {
    console.warn('Failed to load cached cards:', e);
  }
  return [];
}

/**
 * Save cards to localStorage cache
 */
export function saveCachedCards(cards: WikiCard[]): void {
  try {
    const data: CacheData = {
      cards: cards.slice(0, 50), // Limit cache size
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save cards to cache:', e);
  }
}

/**
 * Clear the cache
 */
export function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    console.warn('Failed to clear cache:', e);
  }
}

/**
 * Add cards to cache (deduplicating)
 */
export function addToCache(newCards: WikiCard[]): WikiCard[] {
  const existing = loadCachedCards();
  const existingIds = new Set(existing.map(c => c.id));

  const uniqueNewCards = newCards.filter(c => !existingIds.has(c.id));
  const combined = [...existing, ...uniqueNewCards];

  saveCachedCards(combined);
  return combined;
}

/**
 * Remove a card from cache by ID
 */
export function removeFromCache(cardId: string): void {
  const cards = loadCachedCards();
  const filtered = cards.filter(c => c.id !== cardId);
  saveCachedCards(filtered);
}

/**
 * Saved articles functionality
 */
const SAVED_KEY = 'wikitok_saved';

export function loadSavedCards(): WikiCard[] {
  try {
    const stored = localStorage.getItem(SAVED_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load saved cards:', e);
  }
  return [];
}

export function saveCard(card: WikiCard): void {
  try {
    const saved = loadSavedCards();
    if (!saved.some(c => c.id === card.id)) {
      saved.unshift(card);
      localStorage.setItem(SAVED_KEY, JSON.stringify(saved.slice(0, 100)));
    }
  } catch (e) {
    console.warn('Failed to save card:', e);
  }
}

export function unsaveCard(cardId: string): void {
  try {
    const saved = loadSavedCards();
    const filtered = saved.filter(c => c.id !== cardId);
    localStorage.setItem(SAVED_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to unsave card:', e);
  }
}

export function isCardSaved(cardId: string): boolean {
  const saved = loadSavedCards();
  return saved.some(c => c.id === cardId);
}
