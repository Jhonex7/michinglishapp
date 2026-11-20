import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { contentIndexPlugin } from './src/validation/contentIndex.js'

/// <reference types="vitest" />
// https://vitejs.dev/config/
export default defineConfig({
  base: '/michinglishapp/',
  plugins: [
    react(),
    // Generates public/**/index.json from the student folders (never edited by hand).
    contentIndexPlugin(),
    VitePWA({ 
      registerType: 'autoUpdate',
      base: '/michinglishapp/',
      workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,json}'],
      runtimeCaching: [
        {
          urlPattern: /\/data\/.*\.json$/, // Expresión regular para caché de archivos JSON
          handler: 'CacheFirst', // O usa 'NetworkFirst'
          options: {
            cacheName: 'data-cache',
            expiration: {
            maxEntries: 50, // Número máximo de archivos que se pueden almacenar
            maxAgeSeconds: 24 * 60 * 60, // 1 día
          },
        },
      },
    ],
      },
      manifest: {
        name: 'Michi English App',
        short_name: 'MichiEnglish',
        start_url: '/michinglishapp/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
          {
            "src": "./pwa-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any"
          },
          {
            "src": "./pwa-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any"
          },
          {
            "src": "./pwa-maskable-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "maskable"
          },
          {
            "src": "./pwa-maskable-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "maskable"
          }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/test/**', 'src/**/*.test.{js,jsx}'],
      reporter: ['text-summary', 'html'],
    },
  },
})
