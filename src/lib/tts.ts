import type { TTSState } from './types';

type TTSCallback = (state: TTSState) => void;

/**
 * TTS Controller using Web Speech API
 */
class TTSController {
  private utterance: SpeechSynthesisUtterance | null = null;
  private callbacks: Set<TTSCallback> = new Set();
  private _state: TTSState = 'idle';
  private _rate: number = 1.0;
  private _voice: SpeechSynthesisVoice | null = null;
  private _isSupported: boolean;
  private _preferredLang = 'en-US';

  constructor() {
    this._isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

    if (this._isSupported) {
      // Handle page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this._state === 'speaking') {
          this.pause();
        }
      });
    } else {
      this._state = 'unavailable';
    }
  }

  get isSupported(): boolean {
    return this._isSupported;
  }

  get state(): TTSState {
    return this._state;
  }

  get rate(): number {
    return this._rate;
  }

  set rate(value: number) {
    this._rate = Math.max(0.5, Math.min(2.0, value));
  }

  get voice(): SpeechSynthesisVoice | null {
    return this._voice;
  }

  set voice(value: SpeechSynthesisVoice | null) {
    this._voice = value;
  }

  private setState(state: TTSState): void {
    this._state = state;
    this.callbacks.forEach(cb => cb(state));
  }

  /**
   * Subscribe to TTS state changes
   */
  subscribe(callback: TTSCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    if (!this._isSupported) return [];
    return window.speechSynthesis.getVoices();
  }

  /**
   * Load voices (needed for some browsers)
   */
  async loadVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!this._isSupported) return [];

    return new Promise((resolve) => {
      const voices = this.getVoices();
      if (voices.length > 0) {
        this.setPreferredVoice(voices);
        resolve(voices);
        return;
      }

      // Some browsers load voices asynchronously
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        const nextVoices = this.getVoices();
        this.setPreferredVoice(nextVoices);
        resolve(nextVoices);
      }, { once: true });

      // Timeout fallback
      setTimeout(() => {
        const nextVoices = this.getVoices();
        this.setPreferredVoice(nextVoices);
        resolve(nextVoices);
      }, 1000);
    });
  }

  private setPreferredVoice(voices: SpeechSynthesisVoice[]): void {
    if (this._voice || voices.length === 0) return;

    const preferred = voices.find(voice => voice.lang === this._preferredLang);
    if (preferred) {
      this._voice = preferred;
      return;
    }

    const english = voices.find(voice => voice.lang?.startsWith('en-'));
    if (english) {
      this._voice = english;
    }
  }

  /**
   * Speak text
   */
  speak(text: string): void {
    if (!this._isSupported) {
      this.setState('unavailable');
      return;
    }

    // Cancel any existing speech
    this.stop();

    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.rate = this._rate;

    if (!this._voice) {
      this.setPreferredVoice(this.getVoices());
    }

    if (this._voice) {
      this.utterance.voice = this._voice;
    }

    this.utterance.onstart = () => this.setState('speaking');
    this.utterance.onpause = () => this.setState('paused');
    this.utterance.onresume = () => this.setState('speaking');
    this.utterance.onend = () => this.setState('idle');
    this.utterance.onerror = (event) => {
      if (event.error !== 'interrupted') {
        console.warn('TTS error:', event.error);
      }
      this.setState('idle');
    };

    window.speechSynthesis.speak(this.utterance);
  }

  /**
   * Pause speaking
   */
  pause(): void {
    if (!this._isSupported) return;
    if (this._state === 'speaking') {
      window.speechSynthesis.pause();
      this.setState('paused');
    }
  }

  /**
   * Resume speaking
   */
  resume(): void {
    if (!this._isSupported) return;
    if (this._state === 'paused') {
      window.speechSynthesis.resume();
      this.setState('speaking');
    }
  }

  /**
   * Stop speaking
   */
  stop(): void {
    if (!this._isSupported) return;
    window.speechSynthesis.cancel();
    this.utterance = null;
    this.setState('idle');
  }

  /**
   * Toggle speaking - smart play/pause
   */
  toggle(text: string): void {
    if (this._state === 'speaking') {
      this.pause();
    } else if (this._state === 'paused') {
      this.resume();
    } else {
      this.speak(text);
    }
  }
}

// Singleton instance
export const tts = new TTSController();
