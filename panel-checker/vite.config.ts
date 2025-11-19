import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'spark-logo.svg', 'sample-15min.csv'],
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024
      },
      manifest: {
        name: 'LEEP SPARK Tool – System for Peak Amperage from Real kWh',
        short_name: 'LEEP SPARK',
        description:
          'LEEP SPARK (System for Peak Amperage from Real kWh) screening for electrical panels with utility interval data.',
        theme_color: '#021b33',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: './',
        icons: [
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist'
  },
  server: {
    host: true,
    port: 5173
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
  }
});
