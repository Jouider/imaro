/// <reference types="vitest/config" />
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
import { fileURLToPath } from 'node:url'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url))

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'logo-stacked.png',
        'logo-horizontal.png',
        'logo-horizontal-inverted.png',
      ],
      // Only scope SW to portail routes (gestionnaire desktop doesn't need PWA)
      workbox: {
        navigateFallbackDenylist: [/^\/gestionnaire/, /^\/api/],
        // Bundle is ~2.6 MB until we code-split — bump precache cap to 5 MB.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            // Cache the gestionnaire API and portail API responses
            urlPattern: /\/api\/portail\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'imaro-portail-api',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'imaro-images',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        id: '/portail/',
        name: 'Imaro — Portail Copropriétaire',
        short_name: 'Imaro',
        description:
          'Suivez vos charges, paiements et réclamations de copropriété — Imaro.',
        start_url: '/portail/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#1D4ED8',
        lang: 'fr',
        dir: 'ltr',
        categories: ['finance', 'productivity', 'business'],
        icons: [
          {
            src: '/logo-stacked.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/logo-stacked.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      devOptions: {
        enabled: false, // disabled in dev to keep HMR fast; enable to test
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: 'chromium',
              },
            ],
          },
        },
      },
    ],
  },
})
