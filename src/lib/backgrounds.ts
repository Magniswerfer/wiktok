import type { BackgroundConfig } from './types';

/**
 * Background configurations
 *
 * To add real video loops:
 * 1. Place your MP4/WebM files in public/loops/
 * 2. Add entries here with type: 'video' and src: '/loops/your-file.mp4'
 * 3. Include proper attribution for each video
 *
 * Videos should be:
 * - Short loops (5-15 seconds)
 * - Calming/ambient content
 * - Muted by default
 * - Optimized for web (compressed, reasonable file size)
 */
export const backgrounds: BackgroundConfig[] = [
  {
    id: 'gradient-ocean',
    type: 'gradient',
    colors: ['#0f0c29', '#302b63', '#24243e'],
    attribution: 'Animated gradient (local placeholder)'
  },
  {
    id: 'gradient-sunset',
    type: 'gradient',
    colors: ['#2c3e50', '#fd746c', '#ff9068'],
    attribution: 'Animated gradient (local placeholder)'
  },
  {
    id: 'gradient-forest',
    type: 'gradient',
    colors: ['#134e5e', '#71b280', '#2c3e50'],
    attribution: 'Animated gradient (local placeholder)'
  },
  {
    id: 'gradient-aurora',
    type: 'gradient',
    colors: ['#0f2027', '#203a43', '#2c5364'],
    attribution: 'Animated gradient (local placeholder)'
  },
  {
    id: 'gradient-cosmic',
    type: 'gradient',
    colors: ['#1a1a2e', '#16213e', '#0f3460'],
    attribution: 'Animated gradient (local placeholder)'
  }
  // Example video entry (uncomment and add your own):
  // {
  //   id: 'nature-waterfall',
  //   type: 'video',
  //   src: '/loops/waterfall.mp4',
  //   attribution: 'Waterfall video by [Author] from [Source] (CC0/License)'
  // },
];

/**
 * Get a random background configuration
 */
export function getRandomBackground(): BackgroundConfig {
  const index = Math.floor(Math.random() * backgrounds.length);
  return backgrounds[index];
}

/**
 * Get background by ID
 */
export function getBackgroundById(id: string): BackgroundConfig | undefined {
  return backgrounds.find(bg => bg.id === id);
}

/**
 * Get all background attributions for About page
 */
export function getAllBackgroundAttributions(): string[] {
  return backgrounds.map(bg => bg.attribution);
}
