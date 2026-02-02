import type { TTSState } from '../lib/types';

interface ControlsProps {
  ttsState: TTSState;
  isSaved: boolean;
  isTopicModeActive: boolean;
  audioUnlocked: boolean;
  cardUrl: string;
  cardTitle: string;
  onListen: () => void;
  onPause: () => void;
  onSave: () => void;
  onTopicMode: () => void;
}

function Controls({
  ttsState,
  isSaved,
  isTopicModeActive,
  audioUnlocked,
  cardUrl,
  cardTitle,
  onListen,
  onPause,
  onSave,
  onTopicMode
}: ControlsProps) {
  const isSpeaking = ttsState === 'speaking';
  const isPaused = ttsState === 'paused';
  const isUnavailable = ttsState === 'unavailable';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: cardTitle,
          text: `Check out this Wikipedia article: ${cardTitle}`,
          url: cardUrl
        });
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== 'AbortError') {
          // Fallback to clipboard
          await navigator.clipboard.writeText(cardUrl);
        }
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(cardUrl);
    }
  };

  return (
    <div className="controls">
      {/* Save Button */}
      <button
        className={`control-button ${isSaved ? 'active' : ''}`}
        onClick={onSave}
        aria-label={isSaved ? 'Unsave article' : 'Save article'}
      >
        <span className="control-icon">{isSaved ? '❤️' : '🤍'}</span>
        <span className="control-label">{isSaved ? 'Saved' : 'Save'}</span>
      </button>

      {/* Topic Mode / Similar Button */}
      <button
        className={`control-button ${isTopicModeActive ? 'active' : ''}`}
        onClick={onTopicMode}
        aria-label={isTopicModeActive ? 'Exit topic mode' : 'More like this'}
      >
        <span className="control-icon">{isTopicModeActive ? '🔀' : '🔗'}</span>
        <span className="control-label">{isTopicModeActive ? 'Random' : 'Similar'}</span>
      </button>

      {/* Listen/Pause Button */}
      {isUnavailable ? (
        <button className="control-button disabled" disabled title="TTS not supported">
          <span className="control-icon">🔇</span>
          <span className="control-label">No TTS</span>
        </button>
      ) : !audioUnlocked ? (
        <button className="control-button disabled" disabled title="Tap overlay to enable audio">
          <span className="control-icon">🔊</span>
          <span className="control-label">Listen</span>
        </button>
      ) : isSpeaking || isPaused ? (
        <button
          className={`control-button ${isSpeaking ? 'active' : ''}`}
          onClick={onPause}
          aria-label={isSpeaking ? 'Pause' : 'Resume'}
        >
          <span className="control-icon">{isSpeaking ? '⏸️' : '▶️'}</span>
          <span className="control-label">{isSpeaking ? 'Pause' : 'Resume'}</span>
        </button>
      ) : (
        <button
          className="control-button"
          onClick={onListen}
          aria-label="Listen to article"
        >
          <span className="control-icon">🔊</span>
          <span className="control-label">Listen</span>
        </button>
      )}

      {/* Share Button */}
      <button
        className="control-button"
        onClick={handleShare}
        aria-label="Share article"
      >
        <span className="control-icon">📤</span>
        <span className="control-label">Share</span>
      </button>
    </div>
  );
}

export default Controls;
