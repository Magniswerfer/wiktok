import { useEffect } from 'react';
import { getAllBackgroundAttributions } from '../lib/backgrounds';

interface AboutModalProps {
  onClose: () => void;
}

function AboutModal({ onClose }: AboutModalProps) {
  const backgroundAttributions = getAllBackgroundAttributions();

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2>About WikiTok</h2>

        <section className="about-section">
          <h3>What is WikiTok?</h3>
          <p>
            WikiTok is a micro-learning app that presents Wikipedia content in a
            swipeable, mobile-friendly format. Discover new topics with each swipe
            and listen to articles with text-to-speech.
          </p>
        </section>

        <section className="about-section">
          <h3>Content Attribution</h3>
          <p>
            All text content is sourced from{' '}
            <a
              href="https://en.wikipedia.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              Wikipedia
            </a>
            , the free encyclopedia.
          </p>
          <p>
            Wikipedia content is available under the{' '}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Creative Commons Attribution-ShareAlike 4.0 License (CC BY-SA 4.0)
            </a>
            .
          </p>
          <p>
            This app uses the{' '}
            <a
              href="https://en.wikipedia.org/api/rest_v1/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Wikipedia REST API
            </a>{' '}
            to fetch article summaries.
          </p>
        </section>

        <section className="about-section">
          <h3>Background Attributions</h3>
          <ul className="attribution-list">
            {backgroundAttributions.map((attr, index) => (
              <li key={index}>{attr}</li>
            ))}
          </ul>
        </section>

        <section className="about-section">
          <h3>Privacy</h3>
          <p>
            WikiTok runs entirely in your browser. No personal data is collected
            or sent to any server. Your saved articles and preferences are stored
            locally on your device.
          </p>
          <p>
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer">
              Read our full Privacy Policy
            </a>
          </p>
        </section>

        <section className="about-section">
          <h3>Open Source</h3>
          <p>
            WikiTok is open source software. The source code is available for
            review and contribution.
          </p>
        </section>
      </div>
    </div>
  );
}

export default AboutModal;
