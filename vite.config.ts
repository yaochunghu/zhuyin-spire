import { defineConfig } from 'vite';

const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "media-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
].join('; ');

export default defineConfig(({ command, mode }) => ({
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
