import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
].join('; ');

export default defineConfig(({ command, mode }) => ({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    target: ['chrome120', 'edge120', 'firefox121', 'safari17'],
    // Audio clips are fetched with connect-src 'self', which blocks data: URLs,
    // so an MP3 must always stay a separate file however small it is.
    assetsInlineLimit: (filePath: string) => (filePath.endsWith('.mp3') ? false : undefined),
  },
  base: command === 'build' || mode === 'production' ? '/zhuyin-spire/' : '/',
  plugins:
    command === 'build'
      ? [
          {
            name: 'privacy-first-csp',
            transformIndexHtml: {
              order: 'pre',
              handler: () => [
                {
                  tag: 'meta',
                  attrs: {
                    'http-equiv': 'Content-Security-Policy',
                    content: PRODUCTION_CSP,
                  },
                  injectTo: 'head-prepend',
                },
              ],
            },
          },
        ]
      : [],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
}));
