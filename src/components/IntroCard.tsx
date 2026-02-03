interface IntroCardProps {
  audioUnlocked: boolean;
  onEnableAudio: () => void;
  onStart: () => void;
}

function IntroCard({ audioUnlocked, onEnableAudio, onStart }: IntroCardProps) {
  return (
    <div className="card intro-card">
      <div className="card-overlay" />
      <div className="intro-card-content">
        <div className="intro-card-badge">Welcome to WikiTok</div>
        <h1 className="intro-card-title">Swipe to learn something new</h1>
        <ul className="intro-card-list">
          <li>Swipe up or down to move between articles</li>
          <li>Tap the text to expand it</li>
          <li>Use the speaker to listen to narration</li>
        </ul>
        <div className="intro-card-actions">
          <button
            className="intro-card-button"
            onClick={onStart}
            aria-label="Start reading"
          >
            Start Swiping
          </button>
          <button
            className="intro-card-button secondary"
            onClick={onEnableAudio}
            disabled={audioUnlocked}
            aria-label={audioUnlocked ? 'Audio enabled' : 'Enable audio'}
          >
            {audioUnlocked ? 'Audio Enabled' : 'Enable Audio'}
          </button>
        </div>
        <p className="intro-card-hint">Swipe up to begin</p>
      </div>
    </div>
  );
}

export default IntroCard;
