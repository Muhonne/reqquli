/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUILD_TIME: string
  readonly VITE_GIT_COMMIT: string
  readonly VITE_GIT_BRANCH: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}