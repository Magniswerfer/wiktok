# WikiTok

A mobile-first PWA that presents Wikipedia content in a TikTok-style swipeable vertical feed. Learn something new with every swipe!

## Features

- **Swipeable Feed**: Vertical scroll-snap navigation, just like TikTok
- **Wikipedia Content**: All text comes from Wikipedia's REST API
- **Text-to-Speech**: Listen to articles with the Web Speech API
- **Topic Mode**: Find related articles by tapping "Similar"
- **Save Articles**: Bookmark articles for later
- **Offline Support**: PWA with service worker caching
- **Mobile-First**: Designed for mobile Safari and Chrome
- **Attribution**: Every card shows Wikipedia attribution and source links

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development

The app will be available at `http://localhost:5173` (or the next available port).

## Project Structure

```
src/
├── app/
│   └── App.tsx           # Main app component
├── components/
│   ├── Feed.tsx          # Swipeable feed container
│   ├── Card.tsx          # Individual article card
│   ├── Controls.tsx      # TTS and navigation controls
│   ├── Background.tsx    # Video/gradient backgrounds
│   ├── AudioUnlockOverlay.tsx  # iOS audio permission
│   ├── AboutModal.tsx    # Attribution information
│   └── OfflineNotice.tsx # Offline state UI
├── lib/
│   ├── types.ts          # TypeScript type definitions
│   ├── wikipedia.ts      # Wikipedia API client
│   ├── cache.ts          # LocalStorage cache wrapper
│   ├── tts.ts            # Text-to-speech controller
│   ├── feed.ts           # Feed queue management
│   └── backgrounds.ts    # Background configurations
├── main.tsx              # Entry point
└── styles.css            # Global styles

public/
├── loops/                # Video loop files (add your own)
├── favicon.svg           # Favicon
├── icon-192.svg          # PWA icon (192x192)
├── icon-512.svg          # PWA icon (512x512)
└── apple-touch-icon.svg  # iOS home screen icon
```

## Adding Background Videos

The app uses animated gradients by default. To add real video backgrounds:

1. Place your video files (MP4 or WebM) in `public/loops/`
2. Edit `src/lib/backgrounds.ts` to add video configurations:

```typescript
{
  id: 'nature-waterfall',
  type: 'video',
  src: '/loops/waterfall.mp4',
  attribution: 'Waterfall video by [Author] from [Source] (License)'
}
```

**Video requirements:**
- Short loops (5-15 seconds)
- Calming/ambient content
- Compressed for web
- Include proper attribution

## PWA Installation

The app can be installed as a PWA on supported devices:

1. Visit the app in Chrome or Safari
2. Look for the "Add to Home Screen" prompt
3. The app works offline with cached content

## API Usage

WikiTok uses the [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/):

- `GET /page/random/summary` - Random article
- `GET /page/summary/{title}` - Specific article
- `GET /page/related/{title}` - Related articles

All content is attributed and links back to Wikipedia.

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Respects `prefers-reduced-motion`
- High contrast text over backgrounds
- Keyboard navigation support

## Browser Support

- Chrome/Edge 90+
- Safari 14+
- Firefox 88+

Note: TTS support varies by browser and device.

## License

This project is open source. Wikipedia content is used under CC BY-SA 4.0.

## Contributing

Contributions are welcome! Please ensure any changes:

1. Maintain Wikipedia attribution on all content
2. Follow the existing code style
3. Test on mobile devices
4. Don't add unnecessary dependencies
