/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'mock' (default, synthetic in-browser backend) or 'live' (same-origin FastAPI /api). */
  readonly VITE_API_MODE?: 'mock' | 'live';
  /** 'browser' (default) or 'hash' routing. */
  readonly VITE_ROUTER_MODE?: 'browser' | 'hash';
}
