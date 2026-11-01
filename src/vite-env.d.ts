/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'mock' | 'fastapi';
  readonly VITE_API_BASE_URL?: string;
}
