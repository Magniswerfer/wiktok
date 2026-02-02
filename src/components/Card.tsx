import { useState, useEffect } from 'react';
import type { WikiCard, AppSettings, TTSState, BackgroundConfig } from '../lib/types';
import { tts } from '../lib/tts';
import { saveCard, unsaveCard, isCardSaved } from '../lib/cache';
import Controls from './Controls';

interface CardProps {
  card: WikiCard;
  isActive: boolean;
  background: BackgroundConfig;
  settings: AppSettings;
  onNext: () => void;
  onPrevious: () => void;
  onTopicMode: () => void;
  onShowAbout: () => void;
  isTopicModeActive: boolean;
}

function Card({
  card,
  isActive,
  background,
  settings,
  onTopicMode,
  onShowAbout,
  isTopicModeActive
}: CardProps) {
  const [ttsState, setTtsState] = useState<TTSState>(tts.state);
  const [isSaved, setIsSaved] = useState(() => isCardSaved(card.id));
  const [isExpanded, setIsExpanded] = useState(false);

  // Update saved/expanded state when card changes (for recycled components)
  useEffect(() => {
    setIsSaved(isCardSaved(card.id));
    setIsExpanded(false);
  }, [card.id]);

  // Subscribe to TTS state changes
  useEffect(() => {
    const unsubscribe = tts.subscribe(setTtsState);
    return unsubscribe;
  }, []);

  // Stop TTS when card becomes inactive
  useEffect(() => {
    if (!isActive && ttsState !== 'idle') {
      tts.stop();
    }
  }, [isActive, ttsState]);

  const handleListen = () => {
    if (!settings.audioUnlocked) return;
    tts.toggle(`${card.title}. ${card.extract}`);
  };

  const handlePause = () => {
    if (ttsState === 'speaking') {
      tts.pause();
    } else if (ttsState === 'paused') {
      tts.resume();
    }
  };

  const handleSave = () => {
    if (isSaved) {
      unsaveCard(card.id);
      setIsSaved(false);
    } else {
      saveCard(card);
      setIsSaved(true);
    }
  };

  return (
    <div className="card">
      <div className="card-overlay" />

      <div className={`card-stack ${isExpanded ? 'expanded' : ''}`}>
        {card.thumbnailUrl ? (
          <div className="card-media">
            <div className="card-media-glow" />
            <div className="card-media-frame">
              <img
                src={card.thumbnailUrl}
                alt={`Illustration from Wikipedia for ${card.title}`}
                loading="lazy"
              />
            </div>
          </div>
        ) : null}

        <div className="card-content">
          <h1 className="card-title">{card.title}</h1>

          <p
            className={`card-extract ${isExpanded ? 'expanded' : ''}`}
            onClick={() => setIsExpanded(prev => !prev)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setIsExpanded(prev => !prev);
              }
            }}
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
          >
            {card.extract}
            <span className="card-extract-toggle">
              {isExpanded ? 'Show less' : 'Read more'}
            </span>
          </p>

        </div>
      </div>

      <Controls
        ttsState={ttsState}
        isSaved={isSaved}
        isTopicModeActive={isTopicModeActive}
        audioUnlocked={settings.audioUnlocked}
        cardUrl={card.url}
        cardTitle={card.title}
        onListen={handleListen}
        onPause={handlePause}
        onSave={handleSave}
        onTopicMode={onTopicMode}
      />

      <footer className="card-bar">
        <div className="card-bar-links">
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="view-source-link"
          >
            View on Wikipedia
          </a>
          <span className="meta-separator">•</span>
          <span className="meta-license">{card.source.license}</span>
          {card.thumbnailUrl ? (
            <>
              <span className="meta-separator">•</span>
              <span className="meta-credit">Image from Wikipedia</span>
            </>
          ) : null}
          {background.pexels ? (
            <>
              <span className="meta-separator">•</span>
              <span className="meta-credit">
                Video by{' '}
                <a
                  href={background.pexels.photographerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {background.pexels.photographerName}
                </a>{' '}
                on{' '}
                <a
                  href={background.pexels.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Pexels
                </a>
              </span>
            </>
          ) : null}
        </div>
        <button
          onClick={onShowAbout}
          className="about-button"
          aria-label="About WikiTok"
        >
          About
        </button>
      </footer>
    </div>
  );
}

export default Card;
