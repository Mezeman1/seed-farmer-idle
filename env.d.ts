/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /**
   * Automatically read from package.json version field
   */
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_BUILD_EPOCH?: string
  /**
   * Debug mode flag for development
   */
  readonly VITE_DEBUG_MODE: string
  readonly VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
