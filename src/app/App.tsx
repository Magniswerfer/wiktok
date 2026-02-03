import { useState, useEffect, useCallback, useRef } from 'react';
import { feedManager } from '../lib/feed';
import { loadSettings, saveSettings } from '../lib/cache';
import { tts } from '../lib/tts';
import { initializeVideos, hasVideos } from '../lib/pexels';
import { clearBackgroundCache } from '../lib/backgrounds';
import type { WikiCard, AppSettings } from '../lib/types';
import Feed from '../components/Feed';
import AboutModal from '../components/AboutModal';
import OfflineNotice from '../components/OfflineNotice';

function App() {
  const [cards, setCards] = useState<WikiCard[]>(() => feedManager.getCards());
  const [isLoading, setIsLoading] = useState(() => feedManager.getCards().length === 0);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [showAbout, setShowAbout] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showIntro, setShowIntro] = useState(() => !getIntroSeen());
  const [isFrameMode, setIsFrameMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 768px)').matches;
  });
  const cardsRef = useRef<WikiCard[]>(cards);
  const hasAppliedVideoBackgrounds = useRef(false);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  // Initialize Pexels videos on app load
  useEffect(() => {
    initializeVideos()
      .then(() => {
        if (!hasAppliedVideoBackgrounds.current && hasVideos()) {
          hasAppliedVideoBackgrounds.current = true;
          clearBackgroundCache();
          setCards(prev => prev.slice());
        }
      })
      .catch(err => {
        console.warn('Failed to initialize Pexels videos:', err);
      });
  }, []);

  // Track frame mode for tablet/desktop layouts
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const updateFrameMode = () => setIsFrameMode(mediaQuery.matches);
    updateFrameMode();
    mediaQuery.addEventListener('change', updateFrameMode);
    return () => mediaQuery.removeEventListener('change', updateFrameMode);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('frame-mode', isFrameMode);
  }, [isFrameMode]);

  // Subscribe to feed updates
  useEffect(() => {
    const unsubscribe = feedManager.subscribe((newCards, loading, feedError) => {
      setCards(newCards);
      setIsLoading(loading);
      setError(feedError);
    });

    // Initialize feed
    feedManager.initialize();

    return unsubscribe;
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (cardsRef.current.length === 0) {
        feedManager.refresh();
      }
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Stop TTS when unmounting
  useEffect(() => {
    return () => {
      tts.stop();
    };
  }, []);

  const handleAudioUnlock = useCallback(() => {
    const newSettings = { ...settings, audioUnlocked: true };
    setSettings(newSettings);
    saveSettings(newSettings);
  }, [settings]);

  const handleSettingsChange = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    await feedManager.refresh();
  }, []);

  return (
    <div className="app-shell">
      <div className="app device-app">
      {isOffline && cards.length === 0 && (
        <OfflineNotice onRetry={handleRefresh} />
      )}

      {isOffline && cards.length > 0 && (
        <div className="offline-banner">
          <span>Offline — showing cached articles</span>
          <button onClick={handleRefresh} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {error && cards.length === 0 && !isOffline && (
        <div className="error-screen">
          <div className="error-content">
            <h2>Oops!</h2>
            <p>{error}</p>
            <button onClick={handleRefresh} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      )}

      {(cards.length > 0 || isLoading) && (
        <Feed
          cards={cards}
          isLoading={isLoading}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onShowAbout={() => setShowAbout(true)}
          showIntro={showIntro}
          onIntroComplete={() => {
            setIntroSeen();
            setShowIntro(false);
          }}
          onEnableAudio={handleAudioUnlock}
          isFrameMode={isFrameMode}
        />
      )}

      {showAbout && (
        <AboutModal onClose={() => setShowAbout(false)} />
      )}
      </div>
      <div className="device-frame" aria-hidden="true">
        <div className="device-notch" />
        <div className="device-speaker" />
        <div className="device-button device-button-top" />
        <div className="device-button device-button-bottom" />
      </div>
    </div>
  );
}

export default App;

const INTRO_COOKIE = 'wikitok_intro_seen';
const INTRO_MAX_AGE = 60 * 60 * 24 * 365;

function getIntroSeen(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie
    .split('; ')
    .some(part => part.startsWith(`${INTRO_COOKIE}=`));
}

function setIntroSeen(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${INTRO_COOKIE}=1; Max-Age=${INTRO_MAX_AGE}; Path=/; SameSite=Lax`;
}
