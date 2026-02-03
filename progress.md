# WikiTok - Development Progress

## Completed Features

### Core Infrastructure
- [x] Vite + React + TypeScript project setup
- [x] TypeScript configuration (tsconfig.json, tsconfig.node.json)
- [x] Package.json with all dependencies
- [x] Project directory structure

### PWA Configuration
- [x] vite-plugin-pwa integration
- [x] PWA manifest configuration
- [x] Service worker with Workbox
- [x] Runtime caching for Wikipedia API responses
- [x] Runtime caching for Wikipedia images
- [x] SVG icons for PWA (192x192, 512x512)
- [x] Apple touch icon
- [x] Favicon

### Wikipedia Integration
- [x] Wikipedia REST API client (`src/lib/wikipedia.ts`)
- [x] Random article fetching
- [x] Article summary by title
- [x] Related pages fetching
- [x] Proper API user-agent header
- [x] WikiCard data model with full attribution

### Feed System
- [x] Feed manager with prefetch logic (`src/lib/feed.ts`)
- [x] In-memory queue management
- [x] Auto-prefetch when approaching end of queue
- [x] Deduplication by page ID
- [x] Topic mode (fetch related articles)

### Caching
- [x] LocalStorage cache wrapper (`src/lib/cache.ts`)
- [x] 24-hour TTL for cached content
- [x] Settings persistence
- [x] Saved articles functionality
- [x] Service worker caching of API responses

### Text-to-Speech
- [x] TTS controller with Web Speech API (`src/lib/tts.ts`)
- [x] Play/pause/stop functionality
- [x] State management and callbacks
- [x] Automatic stop on card change
- [x] Voice selection support (infrastructure ready)
- [x] Rate control support (infrastructure ready)
- [x] Graceful handling of unsupported browsers

### UI Components
- [x] App shell (`src/app/App.tsx`)
- [x] Recycler feed with 3-slide transform paging (`src/components/Feed.tsx`)
- [x] Card component with content display (`src/components/Card.tsx`)
- [x] Control buttons (Listen, Pause, Next, Save, Similar)
- [x] Animated gradient backgrounds (`src/components/Background.tsx`)
- [x] Video background support with preloading (infrastructure ready)
- [x] Audio unlock overlay for iOS (`src/components/AudioUnlockOverlay.tsx`)
- [x] About/Attribution modal (`src/components/AboutModal.tsx`)
- [x] Offline notice (`src/components/OfflineNotice.tsx`)
- [x] Loading spinner
- [x] Error screen with retry

### Feed Navigation (TikTok-style recycler)
- [x] Only 3 DOM nodes (prev, current, next) for performance
- [x] Transform-based slide transitions
- [x] Touch/swipe gesture handling with velocity detection
- [x] Wheel/trackpad support with threshold accumulation
- [x] Keyboard navigation (Arrow Up/Down, j/k)
- [x] Rubber-band effect at boundaries
- [x] Video preloading for next slide
- [x] Consistent background per card via hash function

### Styling
- [x] Mobile-first responsive CSS
- [x] Safe area inset support (notch handling)
- [x] Gradient overlay for text readability
- [x] Transform-based smooth transitions
- [x] Button hover/active states
- [x] `prefers-reduced-motion` support
- [x] Glassmorphism effects (backdrop blur)

### Attribution
- [x] Wikipedia attribution on every card
- [x] "View source" link to Wikipedia article
- [x] CC BY-SA 4.0 license display
- [x] About modal with full attribution info
- [x] Background attribution list

## Not Implemented (Future Enhancements)

### Settings UI
- [ ] Voice selection dropdown in settings
- [ ] TTS rate slider in settings
- [ ] Settings panel/modal UI

### Enhanced Features
- [ ] Haptic feedback (mentioned as not needed)
- [ ] Unit tests
- [ ] E2E tests
- [x] Gesture-based navigation (recycler pattern with swipe/wheel/keyboard)
- [ ] Saved articles view/page
- [ ] Search functionality
- [ ] Language selection (currently English only)

### Real Video Backgrounds
- [ ] Actual video files not included (placeholder gradients work)
- [ ] Instructions provided in README for adding videos

### Production Enhancements
- [ ] ESLint configuration
- [ ] Prettier configuration
- [ ] CI/CD pipeline
- [ ] PNG icons (using SVG instead)

## Known Limitations

1. **TTS Support**: Web Speech API availability varies by browser. Safari on iOS has good support. Firefox support is limited.

2. **Background Videos**: No actual video files included. The app uses animated CSS gradients as placeholders. Video infrastructure is ready - just add files and update `backgrounds.ts`.

3. **PWA Icons**: Using SVG icons which have broad support but may not work on older browsers/devices. For maximum compatibility, convert to PNG.

4. **Wikipedia API Rate Limits**: The Wikipedia REST API is free but may have rate limits. The app doesn't implement retry logic for rate-limited requests.

5. **Offline Mode**: Service worker caches API responses, but if no content is cached, offline mode shows a notice rather than fallback content.

## How to Test

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Browser Testing Checklist

- [ ] Chrome (desktop)
- [ ] Chrome (Android)
- [ ] Safari (desktop)
- [ ] Safari (iOS)
- [ ] Firefox (desktop)
- [ ] Edge (desktop)

## Files Created

```
wiktok/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── README.md
├── progress.md
├── public/
│   ├── favicon.svg
│   ├── icon-192.svg
│   ├── icon-512.svg
│   ├── apple-touch-icon.svg
│   └── loops/
│       └── .gitkeep
└── src/
    ├── main.tsx
    ├── styles.css
    ├── app/
    │   └── App.tsx
    ├── components/
    │   ├── AboutModal.tsx
    │   ├── AudioUnlockOverlay.tsx
    │   ├── Background.tsx
    │   ├── Card.tsx
    │   ├── Controls.tsx
    │   ├── Feed.tsx
    │   └── OfflineNotice.tsx
    └── lib/
        ├── backgrounds.ts
        ├── cache.ts
        ├── feed.ts
        ├── tts.ts
        ├── types.ts
        └── wikipedia.ts
```
