interface AudioUnlockOverlayProps {
  onUnlock: () => void;
}

function AudioUnlockOverlay({ onUnlock }: AudioUnlockOverlayProps) {
  const handleClick = () => {
    // This user interaction unlocks audio on iOS
    // We can also trigger a silent utterance to warm up the TTS
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0;
      window.speechSynthesis.speak(utterance);
    }
    onUnlock();
  };

  return (
    <div className="audio-unlock-overlay" onClick={handleClick}>
      <div className="audio-unlock-content">
        <div className="audio-unlock-icon">🔊</div>
        <h2>Welcome to WikiTok</h2>
        <p>Learn something new with every swipe</p>
        <button className="audio-unlock-button" onClick={handleClick}>
          Tap to Enable Audio
        </button>
        <p className="audio-unlock-hint">
          This enables text-to-speech narration
        </p>
      </div>
    </div>
  );
}

export default AudioUnlockOverlay;
