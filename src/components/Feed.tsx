import { useRef, useEffect, useState, useCallback } from 'react';
import type { WikiCard, AppSettings } from '../lib/types';
import { feedManager } from '../lib/feed';
import { tts } from '../lib/tts';
import Card from './Card';

interface FeedProps {
  cards: WikiCard[];
  isLoading: boolean;
  settings: AppSettings;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  onShowAbout: () => void;
}

// Gesture thresholds
const SWIPE_THRESHOLD = 50; // px to trigger swipe
const SWIPE_VELOCITY_THRESHOLD = 0.3; // px/ms for fast swipes
const WHEEL_THRESHOLD = 100; // accumulated delta to trigger

type SlidePosition = 'prev' | 'current' | 'next';

function Feed({ cards, isLoading, settings, onSettingsChange, onShowAbout }: FeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [offset, setOffset] = useState(0); // Current drag offset in px
  const [isAnimating, setIsAnimating] = useState(false);

  // Touch tracking
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const lastTouchY = useRef(0);

  // Wheel accumulator
  const wheelAccumulator = useRef(0);
  const wheelTimeout = useRef<number | null>(null);

  // Navigate to a specific index
  const goToIndex = useCallback((newIndex: number, animate = true) => {
    if (newIndex < 0 || newIndex >= cards.length || newIndex === currentIndex) {
      // Snap back
      if (animate) {
        setIsAnimating(true);
        setOffset(0);
        setTimeout(() => setIsAnimating(false), 300);
      } else {
        setOffset(0);
      }
      return;
    }

    // Stop TTS when switching cards
    tts.stop();

    if (animate) {
      setIsAnimating(true);
      // Animate to the target position
      const direction = newIndex > currentIndex ? -1 : 1;
      setOffset(direction * window.innerHeight);

      setTimeout(() => {
        setCurrentIndex(newIndex);
        setOffset(0);
        setIsAnimating(false);
        // Prefetch more if needed
        feedManager.maybePreFetch(newIndex);
      }, 300);
    } else {
      setCurrentIndex(newIndex);
      setOffset(0);
      feedManager.maybePreFetch(newIndex);
    }
  }, [currentIndex, cards.length]);

  const goNext = useCallback(() => {
    goToIndex(currentIndex + 1);
  }, [currentIndex, goToIndex]);

  const goPrev = useCallback(() => {
    goToIndex(currentIndex - 1);
  }, [currentIndex, goToIndex]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAnimating) return;
    touchStartY.current = e.touches[0].clientY;
    lastTouchY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  }, [isAnimating]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isAnimating) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    lastTouchY.current = currentY;

    // Limit overscroll at boundaries
    const atStart = currentIndex === 0 && deltaY > 0;
    const atEnd = currentIndex === cards.length - 1 && deltaY < 0;

    if (atStart || atEnd) {
      // Rubber band effect
      setOffset(deltaY * 0.3);
    } else {
      setOffset(deltaY);
    }
  }, [isAnimating, currentIndex, cards.length]);

  const handleTouchEnd = useCallback(() => {
    if (isAnimating) return;

    const deltaY = lastTouchY.current - touchStartY.current;
    const deltaTime = Date.now() - touchStartTime.current;
    const velocity = Math.abs(deltaY) / deltaTime;

    // Determine if we should transition
    const shouldTransition =
      Math.abs(deltaY) > SWIPE_THRESHOLD ||
      velocity > SWIPE_VELOCITY_THRESHOLD;

    if (shouldTransition) {
      if (deltaY < 0) {
        // Swiped up -> go next
        goNext();
      } else {
        // Swiped down -> go prev
        goPrev();
      }
    } else {
      // Snap back
      setIsAnimating(true);
      setOffset(0);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [isAnimating, goNext, goPrev]);

  // Wheel/trackpad handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (isAnimating) return;
      e.preventDefault();

      wheelAccumulator.current += e.deltaY;

      // Clear previous timeout
      if (wheelTimeout.current) {
        clearTimeout(wheelTimeout.current);
      }

      // Check if threshold reached
      if (Math.abs(wheelAccumulator.current) > WHEEL_THRESHOLD) {
        if (wheelAccumulator.current > 0) {
          goNext();
        } else {
          goPrev();
        }
        wheelAccumulator.current = 0;
      } else {
        // Reset accumulator after inactivity
        wheelTimeout.current = window.setTimeout(() => {
          wheelAccumulator.current = 0;
        }, 150);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [isAnimating, goNext, goPrev]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnimating) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        goPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnimating, goNext, goPrev]);

  // Handle "More like this" - Topic mode
  const handleTopicMode = useCallback((card: WikiCard) => {
    if (feedManager.isTopicModeActive()) {
      feedManager.disableTopicMode();
      onSettingsChange({ topicMode: false });
    } else {
      feedManager.enableTopicMode(card.title);
      onSettingsChange({ topicMode: true });
    }
  }, [onSettingsChange]);

  // Get card for a given position
  const getCardForPosition = (position: SlidePosition): WikiCard | null => {
    const indexMap: Record<SlidePosition, number> = {
      prev: currentIndex - 1,
      current: currentIndex,
      next: currentIndex + 1,
    };
    const idx = indexMap[position];
    return cards[idx] ?? null;
  };

  // Calculate transform for each slide
  const getSlideStyle = (position: SlidePosition): React.CSSProperties => {
    const baseOffset: Record<SlidePosition, number> = {
      prev: -100,
      current: 0,
      next: 100,
    };

    const heightPercent = baseOffset[position];
    const dragOffset = (offset / window.innerHeight) * 100;

    return {
      transform: `translateY(${heightPercent + dragOffset}%)`,
      transition: isAnimating ? 'transform 0.3s ease-out' : 'none',
    };
  };

  if (cards.length === 0 && isLoading) {
    return (
      <div className="feed-loading">
        <div className="spinner" />
        <p>Loading articles...</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="feed-loading">
        <p>No articles available</p>
      </div>
    );
  }

  const positions: SlidePosition[] = ['prev', 'current', 'next'];

  return (
    <div
      className="feed-recycler"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {positions.map((position) => {
        const card = getCardForPosition(position);
        if (!card) return null;

        const isActive = position === 'current';
        const isPrefetch = position === 'next';

        return (
          <div
            key={position}
            className="feed-slide"
            style={getSlideStyle(position)}
          >
            <Card
              key={card.id}
              card={card}
              isActive={isActive}
              isPrefetch={isPrefetch}
              settings={settings}
              onNext={goNext}
              onPrevious={goPrev}
              onTopicMode={() => handleTopicMode(card)}
              onShowAbout={onShowAbout}
              isTopicModeActive={feedManager.isTopicModeActive()}
            />
          </div>
        );
      })}

      {/* Loading indicator when prefetching */}
      {isLoading && currentIndex >= cards.length - 2 && (
        <div className="feed-loading-indicator">
          <div className="spinner-small" />
        </div>
      )}
    </div>
  );
}

export default Feed;
