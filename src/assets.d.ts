declare module '*.css';

declare module '*?worker&url' {
  const workerUrl: string;
  export default workerUrl;
}

interface ImportMetaEnv {
  readonly VITE_ROUTING_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
