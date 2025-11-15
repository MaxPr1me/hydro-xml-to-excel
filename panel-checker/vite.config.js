import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icon.svg', 'sample-15min.csv'],
            manifest: {
                name: 'Panel Checker',
                short_name: 'PanelCheck',
                description: 'Upload interval data, graph demand, and screen new loads.',
                theme_color: '#0f172a',
                background_color: '#ffffff',
                display: 'standalone',
                start_url: '/',
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
    }
});
