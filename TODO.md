# TODO

## Phase 0 — Pre‑launch Essentials
- [x] Polish core loop: instant load, zero jank, predictable scroll behavior, and clear offline/error states.
- [x] Streamlined onboarding: explain audio, swiping, and attribution in <30 seconds.
- [x] Ensure attribution compliance for Wikipedia and media sources across all surfaces (including share/export).
- [x] Validate CC BY-SA derivative use requirements and Pexels terms (if used).
- [x] Add robust backoff + retry strategy, timeouts, and offline handling tests.
- [x] Draft and publish a clear privacy policy (tracking, cookies/localStorage).
- [x] Run basic security review and dependency audit.

## Phase 1 — Beta Quality
- Set performance targets: TTI <2s on mid-range mobile, scroll frame drops <1%, memory stable over long sessions.
- Add monitoring: error reporting, performance telemetry, and alerting.
- Minimize data collection by default (when adding database/analytics).
- Add observability: tracing for fetches, cache hit rates, crash analytics.
- Implement report/flag flow for offensive or inaccurate content.
- Add content safety filters and/or disclaimers for sensitive content.
- Tune prefetch + caching strategy; consider CDN caching for Wikipedia data/media.

## Phase 2 — Growth & Retention
- Add retention hooks: topic mode, saves, history, “continue where you left off,” and shareable cards.
- Ensure SEO/indexability and share cards + deep links.
- Validate scalability: rate limits for Wikipedia API, introduce caching proxy if needed.
- Add rate-limiting and abuse prevention (bot scraping, automated refresh).
- Prepare app-store assets and compliance if launching mobile.

## Phase 3 — Monetization (if desired)
- Define ad strategy or premium tier.
- Clarify licensing implications for ads around CC BY-SA content.
