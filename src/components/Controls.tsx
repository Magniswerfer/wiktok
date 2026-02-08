import type { TTSState, BackgroundConfig } from '../lib/types';

interface ControlsProps {
  ttsState: TTSState;
  isSaved: boolean;
  isTopicModeActive: boolean;
  audioUnlocked: boolean;
  cardUrl: string;
  cardTitle: string;
  attributionText: string;
  license: string;
  background: BackgroundConfig;
  onListen: () => void;
  onPause: () => void;
  onSave: () => void;
  onTopicMode: () => void;
  onShowAbout: () => void;
}

function Controls({
  ttsState,
  isSaved,
  isTopicModeActive,
  audioUnlocked,
  cardUrl,
  cardTitle,
  attributionText,
  license,
  background,
  onListen,
  onPause,
  onSave,
  onTopicMode,
  onShowAbout
}: ControlsProps) {
  const isSpeaking = ttsState === 'speaking';
  const isPaused = ttsState === 'paused';
  const isUnavailable = ttsState === 'unavailable';

  const buildShareText = (): string => {
    let text = `${attributionText} (${license})`;
    if (background.pexels) {
      text += ` | Video by ${background.pexels.photographerName} on Pexels`;
    }
    return text;
  };

  const copyToClipboardSafely = async (text: string): Promise<boolean> => {
    if (!navigator.clipboard?.writeText) {
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const handleShare = async () => {
    const shareText = buildShareText();
    const sharePayload = `${shareText}\n${cardUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: cardTitle,
          text: shareText,
          url: cardUrl
        });
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== 'AbortError') {
          // Fallback to clipboard with full attribution (non-throwing)
          await copyToClipboardSafely(sharePayload);
        }
      }
    } else {
      // Fallback: copy to clipboard with full attribution (non-throwing)
      await copyToClipboardSafely(sharePayload);
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

      {/* About Button */}
      <button
        className="control-button"
        onClick={onShowAbout}
        aria-label="About WikiTok"
      >
        <span className="control-icon">ℹ️</span>
        <span className="control-label">About</span>
      </button>
    </div>
  );
}

export default Controls;
