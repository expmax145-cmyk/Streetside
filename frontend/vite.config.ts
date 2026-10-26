import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // ITEM C (PWA/offline, deferred item from the original fix pass):
    // installable app + an app-shell that still loads when offline.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'StreetSide — Street Food Discovery',
        short_name: 'StreetSide',
        description: 'Discover the best street food vendors around you.',
        theme_color: '#ea580c',
        background_color: '#fff7ed',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/favicon-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/favicon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the built app shell (HTML/JS/CSS) so the app still
        // boots offline; API data itself is NOT precached (it goes
        // stale immediately for a vendor-discovery app), only cached
        // opportunistically at runtime below.
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Never let the service worker intercept API or media calls —
        // those need the network-first runtime rules below, not the
        // default precache-first navigation fallback.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Vendor/menu/offer/event GETs: show cached data instantly
            // if offline or slow, but always try the network first so
            // a connected user never sees stale prices/hours.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'streetside-api-cache',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 }, // 24h
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Uploaded images (Media collection) and vendor/menu photos
            // are immutable once created (ITEM E) — safe to cache
            // aggressively and serve from cache first.
            urlPattern: ({ url, request }) =>
              request.destination === 'image' &&
              (url.pathname.startsWith('/api/media/') || url.pathname.startsWith('/vendor-images/') || url.pathname.startsWith('/menu-images/')),
            handler: 'CacheFirst',
            options: {
              cacheName: 'streetside-image-cache',
              expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 }, // 30 days
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Service workers can be confusing during local development
        // (stale-cache debugging); only enabled in production builds.
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
