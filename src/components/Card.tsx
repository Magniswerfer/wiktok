import { useState, useEffect, useRef } from 'react';
import type { WikiCard, AppSettings, TTSState, BackgroundConfig } from '../lib/types';
import { tts } from '../lib/tts';
import { saveCard, unsaveCard, isCardSaved } from '../lib/cache';
import Controls from './Controls';
import CardImage from './CardImage';

function cleanAttributionText(value?: string): string {
  if (!value) return '';
  return value
    .replace(/[\u2800\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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
  nextThumbnailUrl?: string | null;
  scrollProgress?: number;
}

function Card({
  card,
  isActive,
  background,
  settings,
  onTopicMode,
  onShowAbout,
  isTopicModeActive,
  nextThumbnailUrl,
  scrollProgress = 0
}: CardProps) {
  const [ttsState, setTtsState] = useState<TTSState>(tts.state);
  const [isSaved, setIsSaved] = useState(() => isCardSaved(card.id));
  const [isExpanded, setIsExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const extractRef = useRef<HTMLParagraphElement>(null);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);

  // Update saved/expanded state when card changes (for recycled components)
  useEffect(() => {
    setIsSaved(isCardSaved(card.id));
    setIsExpanded(false);
    setCanExpand(false);
    swipeStartX.current = null;
    swipeStartY.current = null;
  }, [card.id]);

  useEffect(() => {
    const element = extractRef.current;
    if (!element || isExpanded) return;
    const frame = requestAnimationFrame(() => {
      if (!extractRef.current) return;
      const { scrollHeight, clientHeight } = extractRef.current;
      setCanExpand(scrollHeight > clientHeight + 2);
    });
    return () => cancelAnimationFrame(frame);
  }, [card.extract, card.title, isExpanded]);

  // Subscribe to TTS state changes
  useEffect(() => {
    const unsubscribe = tts.subscribe(setTtsState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isExpanded) {
      document.body.classList.add('card-expanded-open');
      return () => {
        document.body.classList.remove('card-expanded-open');
      };
    }
    document.body.classList.remove('card-expanded-open');
    return undefined;
  }, [isExpanded]);

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

  const handleSwipeStart = (x: number, y: number) => {
    swipeStartX.current = x;
    swipeStartY.current = y;
  };

  const handleSwipeEnd = (x: number, y: number) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return;
    const deltaX = x - swipeStartX.current;
    const deltaY = y - swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;
    if (deltaX > 80 && Math.abs(deltaY) < 50) {
      setIsExpanded(false);
    }
  };

  return (
    <div className={`card ${isExpanded ? 'is-expanded' : ''}`}>
      <div className="card-overlay" />

      {background.pexels ? (
        <div className="card-credit-top" aria-label="Pexels video attribution">
          <a
            href={background.pexels.photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {cleanAttributionText(background.pexels.photographerName) || 'Pexels Creator'}
          </a>
          <span className="meta-separator">•</span>
          <a
            href={background.pexels.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Pexels
          </a>
        </div>
      ) : null}

      <div className={`card-attribution ${background.pexels ? 'with-pexels' : ''}`}>
        <div className="card-attribution-row">
          <span className="meta-credit">Text:</span>
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="license-link"
          >
            CC BY-SA 4.0
          </a>
        </div>
        {card.thumbnailUrl ? (
          <div className="card-attribution-row">
            {card.imageAttribution?.filePageUrl ? (
              <a
                href={card.imageAttribution.filePageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="license-link"
              >
                Image:{' '}
                {cleanAttributionText(
                  card.imageAttribution.artist
                    || card.imageAttribution.credit
                    || card.imageAttribution.attribution
                ) || 'Wikimedia Commons'}
              </a>
            ) : (
              <span className="meta-credit">
                Image:{' '}
                {cleanAttributionText(
                  card.imageAttribution?.artist
                    || card.imageAttribution?.credit
                    || card.imageAttribution?.attribution
                ) || 'Wikimedia Commons'}
              </span>
            )}
            {card.imageAttribution?.license ? (
              <>
                {card.imageAttribution.licenseUrl ? (
                  <a
                    href={card.imageAttribution.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="license-link"
                  >
                    {card.imageAttribution.license}
                  </a>
                ) : (
                  <span className="meta-credit">{card.imageAttribution.license}</span>
                )}
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={`card-stack ${isExpanded ? 'expanded' : ''}`}>
        {card.thumbnailUrl ? (
          <div className="card-media">
            <div className="card-media-glow" />
            <div className="card-media-frame">
              <CardImage
                src={card.thumbnailUrl}
                nextSrc={nextThumbnailUrl}
                alt={`Illustration from Wikipedia for ${card.title}`}
                scrollProgress={scrollProgress}
              />
            </div>
          </div>
        ) : null}

        <div className="card-content">
          <h1 className="card-title">
            <span className="card-title-text">{card.title}</span>
          </h1>

          <p
            className="card-extract"
            onClick={() => setIsExpanded(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setIsExpanded(true);
              }
            }}
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            ref={extractRef}
          >
            {card.extract}
          </p>
          {canExpand && !isExpanded ? (
            <button
              type="button"
              className="card-extract-toggle"
              onClick={() => setIsExpanded(true)}
              aria-expanded={false}
            >
              Read more
            </button>
          ) : null}

          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="view-source-link inline"
          >
            View on Wikipedia
          </a>
        </div>
      </div>

      {isExpanded ? (
        <div
          className="card-expanded"
          role="dialog"
          aria-modal="true"
          onTouchStart={(event) => {
            if (event.touches.length !== 1) return;
            const touch = event.touches[0];
            if (touch.clientX > 40) return;
            handleSwipeStart(touch.clientX, touch.clientY);
          }}
          onTouchEnd={(event) => {
            const touch = event.changedTouches[0];
            if (!touch) return;
            handleSwipeEnd(touch.clientX, touch.clientY);
          }}
          onPointerDown={(event) => {
            if (event.pointerType !== 'touch') return;
            if (event.clientX > 40) return;
            handleSwipeStart(event.clientX, event.clientY);
          }}
          onPointerUp={(event) => {
            if (event.pointerType !== 'touch') return;
            handleSwipeEnd(event.clientX, event.clientY);
          }}
        >
          <button
            type="button"
            className="card-expanded-close"
            onClick={() => setIsExpanded(false)}
            aria-label="Close expanded view"
          >
            ×
          </button>
          {card.thumbnailUrl ? (
            <div className="card-expanded-hero">
              <div className="card-expanded-hero-media">
                <CardImage
                  src={card.thumbnailUrl}
                  alt={`Illustration from Wikipedia for ${card.title}`}
                  scrollProgress={0}
                />
              </div>
              <h2 className="card-expanded-title">{card.title}</h2>
            </div>
          ) : (
            <div className="card-expanded-hero no-image">
              <div className="card-expanded-hero-fallback" />
              <h2 className="card-expanded-title">{card.title}</h2>
            </div>
          )}
          <div className="card-expanded-body">
            <p className="card-expanded-text">{card.extract}</p>
          </div>
          <div className="card-expanded-cta">
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              className="view-source-link prominent"
            >
              READ MORE ON WIKIPEDIA
            </a>
          </div>
        </div>
      ) : (
        <Controls
          ttsState={ttsState}
          isSaved={isSaved}
          isTopicModeActive={isTopicModeActive}
          audioUnlocked={settings.audioUnlocked}
          cardUrl={card.url}
          cardTitle={card.title}
          attributionText={card.source.attributionText}
          license={card.source.license}
          background={background}
          onListen={handleListen}
          onPause={handlePause}
          onSave={handleSave}
          onTopicMode={onTopicMode}
          onShowAbout={onShowAbout}
        />
      )}
    </div>
  );
}

export default Card;
