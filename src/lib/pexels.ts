/**
 * Pexels API integration for video backgrounds
 */

const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY;
const PEXELS_API_URL = 'https://api.pexels.com/videos/search';

const SEARCH_QUERIES = [
  'nature calm',
  'abstract',
  'relaxing landscape',
  'ocean waves',
  'clouds sky',
  'forest trees',
  'water ripples',
  'northern lights'
];

const CACHE_KEY = 'pexels_videos_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface PexelsVideoInfo {
  videoSrc: string;
  photographerName: string;
  photographerUrl: string;
  videoPageUrl: string;
}

interface CachedVideos {
  videos: PexelsVideoInfo[];
  timestamp: number;
}

interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

interface PexelsVideo {
  id: number;
  url: string;
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: PexelsVideoFile[];
}

interface PexelsResponse {
  videos: PexelsVideo[];
  total_results: number;
}

let cachedVideos: PexelsVideoInfo[] = [];
let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Get cached videos from localStorage
 */
function getCachedVideos(): PexelsVideoInfo[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedVideos = JSON.parse(cached);
    const isExpired = Date.now() - data.timestamp > CACHE_TTL;

    if (isExpired) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data.videos;
  } catch {
    return null;
  }
}

/**
 * Save videos to localStorage cache
 */
function cacheVideosToStorage(videos: PexelsVideoInfo[]): void {
  try {
    const data: CachedVideos = {
      videos,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage may be full or unavailable
  }
}

/**
 * Fetch videos from Pexels API for a single query
 */
async function fetchVideosForQuery(query: string): Promise<PexelsVideoInfo[]> {
  if (!PEXELS_API_KEY || PEXELS_API_KEY === 'your_api_key_here') {
    return [];
  }

  try {
    const params = new URLSearchParams({
      query,
      per_page: '10',
      orientation: 'portrait'
    });

    const response = await fetch(`${PEXELS_API_URL}?${params}`, {
      headers: {
        Authorization: PEXELS_API_KEY
      }
    });

    if (!response.ok) {
      console.warn(`Pexels API error for query "${query}":`, response.status);
      return [];
    }

    const data: PexelsResponse = await response.json();

    // Extract video URLs (prefer portrait and smaller size to reduce memory)
    const videoInfos: PexelsVideoInfo[] = [];
    for (const video of data.videos) {
      // Sort video files by portrait aspect, then prefer SD and smaller resolution
      const sortedFiles = video.video_files
        .filter(f => f.file_type === 'video/mp4')
        .sort((a, b) => {
          // Prefer portrait videos
          const aIsPortrait = a.height > a.width;
          const bIsPortrait = b.height > b.width;
          if (aIsPortrait && !bIsPortrait) return -1;
          if (!aIsPortrait && bIsPortrait) return 1;

          // Prefer SD quality to reduce decode/memory load
          const aIsSD = a.quality === 'sd';
          const bIsSD = b.quality === 'sd';
          if (aIsSD && !bIsSD) return -1;
          if (!aIsSD && bIsSD) return 1;

          // Then prefer smaller resolution
          const aPixels = a.width * a.height;
          const bPixels = b.width * b.height;
          return aPixels - bPixels;
        });

      if (sortedFiles.length > 0) {
        videoInfos.push({
          videoSrc: sortedFiles[0].link,
          photographerName: video.user.name,
          photographerUrl: video.user.url,
          videoPageUrl: video.url
        });
      }
    }

    return videoInfos;
  } catch (error) {
    console.warn(`Failed to fetch Pexels videos for "${query}":`, error);
    return [];
  }
}

/**
 * Initialize videos - fetches from Pexels API or uses cache
 */
export async function initializeVideos(): Promise<void> {
  // Return existing promise if already initializing
  if (initPromise) {
    return initPromise;
  }

  // Already initialized
  if (isInitialized && cachedVideos.length > 0) {
    return;
  }

  initPromise = (async () => {
    // Check localStorage cache first
    const cached = getCachedVideos();
    if (cached && cached.length > 0) {
      cachedVideos = cached;
      isInitialized = true;
      return;
    }

    // Fetch from API
    const allVideos: PexelsVideoInfo[] = [];

    // Fetch videos for each search query in parallel
    const results = await Promise.all(
      SEARCH_QUERIES.map(query => fetchVideosForQuery(query))
    );

    for (const videos of results) {
      allVideos.push(...videos);
    }

    // Shuffle the videos for variety
    for (let i = allVideos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allVideos[i], allVideos[j]] = [allVideos[j], allVideos[i]];
    }

    if (allVideos.length > 0) {
      cachedVideos = allVideos;
      cacheVideosToStorage(allVideos);
    }

    isInitialized = true;
  })();

  return initPromise;
}

/**
 * Get a random video info from the cache
 * Returns null if no videos are available
 */
export function getRandomVideo(): PexelsVideoInfo | null {
  if (cachedVideos.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * cachedVideos.length);
  return cachedVideos[index];
}

/**
 * Check if videos are available
 */
export function hasVideos(): boolean {
  return cachedVideos.length > 0;
}

/**
 * Check if Pexels is configured
 */
export function isPexelsConfigured(): boolean {
  return !!PEXELS_API_KEY && PEXELS_API_KEY !== 'your_api_key_here';
}
