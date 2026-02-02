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

function Feed({ cards, isLoading, settings, onSettingsChange, onShowAbout }: FeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 2 });

  // Handle scroll snap and detect current card
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const cardHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / cardHeight);

    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < cards.length) {
      // Stop TTS when switching cards
      tts.stop();
      setCurrentIndex(newIndex);

      // Update visible range for performance (only render nearby cards)
      setVisibleRange({
        start: Math.max(0, newIndex - 1),
        end: Math.min(cards.length - 1, newIndex + 2)
      });

      // Check if we need to prefetch more
      feedManager.maybePreFetch(newIndex);
    }
  }, [currentIndex, cards.length]);

  // Add scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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

  // Scroll to next/previous card
  const scrollToCard = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container || index < 0 || index >= cards.length) return;

    const cardHeight = container.clientHeight;
    container.scrollTo({
      top: index * cardHeight,
      behavior: 'smooth'
    });
  }, [cards.length]);

  const handleNext = useCallback(() => {
    scrollToCard(currentIndex + 1);
  }, [currentIndex, scrollToCard]);

  const handlePrevious = useCallback(() => {
    scrollToCard(currentIndex - 1);
  }, [currentIndex, scrollToCard]);

  if (cards.length === 0 && isLoading) {
    return (
      <div className="feed-loading">
        <div className="spinner" />
        <p>Loading articles...</p>
      </div>
    );
  }

  return (
    <div className="feed-container" ref={containerRef}>
      {cards.map((card, index) => {
        // Only render cards in visible range for performance
        const isInRange = index >= visibleRange.start && index <= visibleRange.end;
        const isActive = index === currentIndex;

        return (
          <div key={card.id} className="feed-item">
            {isInRange ? (
              <Card
                card={card}
                isActive={isActive}
                settings={settings}
                onNext={handleNext}
                onPrevious={handlePrevious}
                onTopicMode={() => handleTopicMode(card)}
                onShowAbout={onShowAbout}
                isTopicModeActive={feedManager.isTopicModeActive()}
              />
            ) : (
              <div className="card-placeholder" />
            )}
          </div>
        );
      })}

      {isLoading && cards.length > 0 && (
        <div className="feed-item loading-item">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}

export default Feed;
