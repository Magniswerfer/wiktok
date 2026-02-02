import type { BackgroundConfig } from './types';
import { getRandomVideo, hasVideos } from './pexels';

// Cache backgrounds per card ID so the same card always gets the same background
const backgroundCache = new Map<string, BackgroundConfig>();

/**
 * Fallback gradient configurations
 */
export const gradientBackgrounds: BackgroundConfig[] = [
  {
    id: 'gradient-ocean',
    type: 'gradient',
    colors: ['#0f0c29', '#302b63', '#24243e'],
    attribution: 'Animated gradient'
  },
  {
    id: 'gradient-sunset',
    type: 'gradient',
    colors: ['#2c3e50', '#fd746c', '#ff9068'],
    attribution: 'Animated gradient'
  },
  {
    id: 'gradient-forest',
    type: 'gradient',
    colors: ['#134e5e', '#71b280', '#2c3e50'],
    attribution: 'Animated gradient'
  },
  {
    id: 'gradient-aurora',
    type: 'gradient',
    colors: ['#0f2027', '#203a43', '#2c5364'],
    attribution: 'Animated gradient'
  },
  {
    id: 'gradient-cosmic',
    type: 'gradient',
    colors: ['#1a1a2e', '#16213e', '#0f3460'],
    attribution: 'Animated gradient'
  }
];

/**
 * Get a random background configuration
 * Prefers Pexels videos if available, falls back to gradients
 */
export function getRandomBackground(): BackgroundConfig {
  // Try to get a Pexels video first
  if (hasVideos()) {
    const video = getRandomVideo();
    if (video) {
      return {
        id: `pexels-${Date.now()}-${Math.random()}`,
        type: 'video',
        src: video.videoSrc,
        attribution: `Video by ${video.photographerName} on Pexels`,
        pexels: {
          photographerName: video.photographerName,
          photographerUrl: video.photographerUrl,
          videoUrl: video.videoPageUrl
        }
      };
    }
  }

  // Fall back to gradient
  const index = Math.floor(Math.random() * gradientBackgrounds.length);
  return gradientBackgrounds[index];
}

/**
 * Get a background for a specific card ID (cached)
 * Returns the same background for the same card ID
 */
export function getBackgroundForCard(cardId: string): BackgroundConfig {
  const cached = backgroundCache.get(cardId);
  if (cached) {
    return cached;
  }

  const background = getRandomBackground();
  backgroundCache.set(cardId, background);
  return background;
}

/**
 * Clear the background cache (e.g., on refresh)
 */
export function clearBackgroundCache(): void {
  backgroundCache.clear();
}

/**
 * Get a random gradient background (fallback only)
 */
export function getRandomGradient(): BackgroundConfig {
  const index = Math.floor(Math.random() * gradientBackgrounds.length);
  return gradientBackgrounds[index];
}

/**
 * Get background by ID
 */
export function getBackgroundById(id: string): BackgroundConfig | undefined {
  return gradientBackgrounds.find(bg => bg.id === id);
}

/**
 * Get all background attributions for About page
 */
export function getAllBackgroundAttributions(): string[] {
  const attributions = gradientBackgrounds.map(bg => bg.attribution);
  if (hasVideos()) {
    attributions.unshift('Video backgrounds provided by Pexels (pexels.com)');
  }
  return attributions;
}
