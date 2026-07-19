declare module 'vite' {
  export function build(config: Record<string, unknown>): Promise<void>;
}

declare module '@vitejs/plugin-react' {
  import type { Plugin } from 'vite';
  export default function react(): Plugin;
}

declare module '@tailwindcss/vite' {
  import type { Plugin } from 'vite';
  export default function tailwindcss(): Plugin;
}
