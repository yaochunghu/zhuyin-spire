/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_DEBUG_TOOLS?: 'true' | 'false';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
