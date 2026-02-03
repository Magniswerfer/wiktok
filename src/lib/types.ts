/**
 * WikiCard represents a single Wikipedia article card in the feed
 */
export type WikiCard = {
  id: string; // stable unique, e.g. `${lang}:${pageid}`
  lang: string;
  title: string;
  extract: string;
  url: string; // canonical Wikipedia URL
  thumbnailUrl?: string;
  imageAttribution?: ImageAttribution;
  pageid?: number;
  fetchedAt: number;
  source: {
    name: "Wikipedia";
    license: "CC BY-SA 4.0";
    attributionText: string;
  };
};

/**
 * Attribution details for a Wikipedia/Wikimedia image
 */
export interface ImageAttribution {
  artist?: string;
  credit?: string;
  attribution?: string;
  license?: string;
  licenseUrl?: string;
  filePageUrl?: string;
  sourceUrl?: string;
}

/**
 * Raw response from Wikipedia REST API summary endpoint
 */
export interface WikipediaSummaryResponse {
  type: string;
  title: string;
  displaytitle: string;
  namespace: { id: number; text: string };
  wikibase_item: string;
  titles: {
    canonical: string;
    normalized: string;
    display: string;
  };
  pageid: number;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  originalimage?: {
    source: string;
    width: number;
    height: number;
  };
  lang: string;
  dir: string;
  revision: string;
  tid: string;
  timestamp: string;
  description?: string;
  description_source?: string;
  content_urls: {
    desktop: {
      page: string;
      revisions: string;
      edit: string;
      talk: string;
    };
    mobile: {
      page: string;
      revisions: string;
      edit: string;
      talk: string;
    };
  };
  extract: string;
  extract_html: string;
}

/**
 * Related pages response
 */
export interface WikipediaRelatedResponse {
  pages: WikipediaSummaryResponse[];
}

/**
 * Pexels attribution info
 */
export interface PexelsAttribution {
  photographerName: string;
  photographerUrl: string;
  videoUrl: string; // Link to the video page on Pexels
}

/**
 * Background video/animation configuration
 */
export interface BackgroundConfig {
  id: string;
  type: 'video' | 'gradient';
  src?: string; // for video type
  colors?: string[]; // for gradient type
  attribution: string;
  pexels?: PexelsAttribution; // Pexels-specific attribution
}

/**
 * Pexels video file
 */
export interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

/**
 * Pexels video
 */
export interface PexelsVideo {
  id: number;
  url: string;
  video_files: PexelsVideoFile[];
}

/**
 * Pexels API response
 */
export interface PexelsResponse {
  videos: PexelsVideo[];
  total_results: number;
}

/**
 * TTS state
 */
export type TTSState = 'idle' | 'speaking' | 'paused' | 'unavailable';

/**
 * App settings stored in localStorage
 */
export interface AppSettings {
  audioUnlocked: boolean;
  ttsRate: number;
  ttsVoice: string | null;
  topicMode: boolean;
}

/**
 * Feed state for the queue
 */
export interface FeedState {
  cards: WikiCard[];
  currentIndex: number;
  isLoading: boolean;
  error: string | null;
}
