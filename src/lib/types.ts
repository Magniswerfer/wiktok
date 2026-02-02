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
  pageid?: number;
  fetchedAt: number;
  source: {
    name: "Wikipedia";
    license: "CC BY-SA 4.0";
    attributionText: string;
  };
};

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
 * Background video/animation configuration
 */
export interface BackgroundConfig {
  id: string;
  type: 'video' | 'gradient';
  src?: string; // for video type
  colors?: string[]; // for gradient type
  attribution: string;
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
