/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Strict CSP mirroring the local FastAPI deployment: no inline scripts or styles,
 * no remote origins. `blob:` media is needed only for the simulated backend's synthetic
 * audio and in-browser uploads. The preview server sends it so tests run under it.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

// Dev-only proxy for VITE_API_MODE=live against a local FastAPI on 127.0.0.1:8000.
const apiTarget = process.env.VITE_DEV_PROXY_TARGET ?? 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { host: '127.0.0.1', proxy: { '/api': { target: apiTarget, changeOrigin: true } } },
  preview: { host: '127.0.0.1', headers: { 'Content-Security-Policy': CONTENT_SECURITY_POLICY } },
  build: {
    target: 'es2022',
    sourcemap: true,
    // No inline polyfill script, so the build works under script-src 'self'.
    modulePreload: { polyfill: false },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
