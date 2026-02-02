interface OfflineNoticeProps {
  onRetry: () => void;
}

function OfflineNotice({ onRetry }: OfflineNoticeProps) {
  return (
    <div className="offline-notice">
      <div className="offline-content">
        <div className="offline-icon">📶</div>
        <h2>You're Offline</h2>
        <p>
          WikiTok needs an internet connection to fetch new articles.
        </p>
        <p className="offline-hint">
          Previously viewed articles may still be available once you reconnect.
        </p>
        <button onClick={onRetry} className="retry-button">
          Try Again
        </button>
      </div>
    </div>
  );
}

export default OfflineNotice;
