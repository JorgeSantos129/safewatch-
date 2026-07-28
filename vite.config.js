import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Base path. Defaults to '/' (custom domain / Netlify / local preview).
// For GitHub Pages project sites the deploy workflow sets VITE_BASE=/<repo>/
// so all asset, manifest and service-worker URLs resolve under the subpath.
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'SafeWatch — Workplace Safety & Risk',
        short_name: 'SafeWatch',
        description: 'Offline-first workplace safety & hazard risk analysis (MARAT method).',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico}'] }
    })
  ],
  server: { host: '0.0.0.0', port: 5173, strictPort: false }
});
