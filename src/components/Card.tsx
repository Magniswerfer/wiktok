import { useState, useEffect, useMemo } from 'react';
import type { WikiCard, AppSettings, TTSState } from '../lib/types';
import { tts } from '../lib/tts';
import { saveCard, unsaveCard, isCardSaved } from '../lib/cache';
import { getRandomBackground } from '../lib/backgrounds';
import Background from './Background';
import Controls from './Controls';

interface CardProps {
  card: WikiCard;
  isActive: boolean;
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
  settings,
  onNext,
  onTopicMode,
  onShowAbout,
  isTopicModeActive
}: CardProps) {
  const [ttsState, setTtsState] = useState<TTSState>(tts.state);
  const [isSaved, setIsSaved] = useState(() => isCardSaved(card.id));

  // Get a consistent background for this card
  const background = useMemo(() => getRandomBackground(), []);

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
      <Background config={background} isActive={isActive} />

      <div className="card-overlay" />

      <div className="card-content">
        {card.thumbnailUrl && (
          <div className="card-thumbnail">
            <img
              src={card.thumbnailUrl}
              alt=""
              loading="lazy"
            />
          </div>
        )}

        <h1 className="card-title">{card.title}</h1>

        <p className="card-extract">{card.extract}</p>

        <Controls
          ttsState={ttsState}
          isSaved={isSaved}
          isTopicModeActive={isTopicModeActive}
          audioUnlocked={settings.audioUnlocked}
          onListen={handleListen}
          onPause={handlePause}
          onNext={onNext}
          onSave={handleSave}
          onTopicMode={onTopicMode}
        />
      </div>

      <footer className="card-footer">
        <div className="attribution">
          <span>Text from </span>
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="wiki-link"
          >
            Wikipedia
          </a>
          <span> ({card.source.license})</span>
        </div>
        <div className="footer-actions">
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="view-source-link"
          >
            View source
          </a>
          <button
            onClick={onShowAbout}
            className="about-button"
            aria-label="About WikiTok"
          >
            About
          </button>
        </div>
      </footer>
    </div>
  );
}

export default Card;
