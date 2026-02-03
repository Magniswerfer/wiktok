import { useState, useEffect, useCallback } from 'react';
import { feedManager } from '../lib/feed';
import { loadSettings, saveSettings } from '../lib/cache';
import { tts } from '../lib/tts';
import { initializeVideos } from '../lib/pexels';
import type { WikiCard, AppSettings } from '../lib/types';
import Feed from '../components/Feed';
import AudioUnlockOverlay from '../components/AudioUnlockOverlay';
import AboutModal from '../components/AboutModal';
import OfflineNotice from '../components/OfflineNotice';

function App() {
  const [cards, setCards] = useState<WikiCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [showAbout, setShowAbout] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Initialize Pexels videos on app load
  useEffect(() => {
    initializeVideos().catch(err => {
      console.warn('Failed to initialize Pexels videos:', err);
    });
  }, []);

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
    const handleOnline = () => setIsOffline(false);
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

  // Show audio unlock overlay on first visit
  const showAudioUnlock = !settings.audioUnlocked && tts.isSupported;

  return (
    <div className="app">
      {showAudioUnlock && (
        <AudioUnlockOverlay onUnlock={handleAudioUnlock} />
      )}

      {isOffline && cards.length === 0 && (
        <OfflineNotice onRetry={handleRefresh} />
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
        />
      )}

      {showAbout && (
        <AboutModal onClose={() => setShowAbout(false)} />
      )}
    </div>
  );
}

export default App;
