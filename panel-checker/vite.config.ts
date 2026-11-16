import { createHash } from 'node:crypto';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages cannot send headers, so production builds get the policy as a <meta> tag.
// Dev is skipped because Vite's hot-reload preamble is an unhashed inline script.
const GOOGLE_ANALYTICS_HOSTS = 'https://*.google-analytics.com https://*.googletagmanager.com';
const INLINE_SCRIPT_PATTERN = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
const CHARSET_META_PATTERN = /<meta charset="[^"]*"\s*\/?>/i;

function injectContentSecurityPolicy(html) {
  // Browsers hash inline scripts after HTML parsing, which normalizes CRLF to LF.
  const scriptHashes = Array.from(html.matchAll(INLINE_SCRIPT_PATTERN), (match) => {
    const digest = createHash('sha256').update(match[1].replace(/\r\n?/g, '\n')).digest('base64');
    return `'sha256-${digest}'`;
  });
  const policy = [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.join(' ')} https://www.googletagmanager.com`,
    // Plotly, React style attributes, and the hidden SEO block rely on inline styles.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${GOOGLE_ANALYTICS_HOSTS}`,
    `connect-src 'self' ${GOOGLE_ANALYTICS_HOSTS} https://*.analytics.google.com`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  if (!CHARSET_META_PATTERN.test(html)) {
    throw new Error('Content-Security-Policy injection needs a <meta charset> tag in index.html.');
  }
  return html.replace(
    CHARSET_META_PATTERN,
    (tag) => `${tag}\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`
  );
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'spark-logo.svg', 'sample-15min.csv'],
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
        id: './',
        scope: './',
        start_url: './',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      }
    }),
    {
      name: 'spark-content-security-policy',
      apply: 'build',
      transformIndexHtml: {
        order: 'post',
        handler: injectContentSecurityPolicy
      }
    }
  ],
  build: {
    outDir: 'dist'
  },
  // The Excel worker lazy-loads SheetJS, which needs code splitting; Uploader already starts it as a module worker.
  worker: {
    format: 'es'
  },
  server: {
    host: true,
    port: 5173
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
  }
});
