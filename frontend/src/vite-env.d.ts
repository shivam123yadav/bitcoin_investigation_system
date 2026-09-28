/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_USE_MOCK: string;
  /**
   * Optional shared deployment token. When set, it is sent as the
   * X-API-Token header on every backend request. Required only when the
   * backend runs with SIH_API_TOKEN set.
   */
  readonly VITE_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
