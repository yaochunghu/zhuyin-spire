/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_DEBUG_TOOLS?: 'true' | 'false';
}

/** Injected from package.json by Vite `define` (see vite.config.ts). */
declare const __APP_VERSION__: string;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
