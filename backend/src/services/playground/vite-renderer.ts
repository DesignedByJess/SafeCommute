import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import crypto from 'crypto';
import { generateEntryPoint, generateStylesheet } from './code-generator';
import type { PlaygroundConfig } from '../../middleware/validate/playground.schema';
import { logger } from '../audit.service';

const COMPILATION_TIMEOUT_MS = 15_000;

export interface RenderResult {
  js: string;
  css: string;
  html: string;
}

async function createTempDir(): Promise<string> {
  const id = crypto.randomBytes(8).toString('hex');
  const dir = path.join(os.tmpdir(), `playground-${id}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup
  }
}

export async function renderWithVite(config: PlaygroundConfig): Promise<RenderResult> {
  const tempDir = await createTempDir();
  const outDir = path.join(tempDir, 'dist');

  try {
    const entryPoint = path.join(tempDir, 'main.tsx');
    const cssFile = path.join(tempDir, 'styles.css');

    const entryCode = generateEntryPoint(config);
    const cssCode = generateStylesheet(config.css || '');

    await fs.writeFile(entryPoint, entryCode, 'utf-8');
    await fs.writeFile(cssFile, cssCode, 'utf-8');

    const [{ build }, { default: react }, { default: tailwindcss }] = await Promise.all([
      import('vite'),
      import('@vitejs/plugin-react'),
      import('@tailwindcss/vite'),
    ]);

    const compilePromise = build({
      root: tempDir,
      logLevel: 'silent',
      build: {
        outDir,
        emptyOutDir: true,
        write: false,
        target: 'es2022',
        cssMinify: true,
        minify: true,
        rollupOptions: {
          input: entryPoint,
          external: ['react', 'react-dom', 'react-dom/client'],
          output: {
            format: 'es',
            entryFileNames: 'index.js',
            chunkFileNames: 'chunks/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]',
          },
        },
      },
      plugins: [
        react(),
        tailwindcss(),
      ],
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Compilation timed out')), COMPILATION_TIMEOUT_MS)
    );

    await Promise.race([compilePromise, timeoutPromise]);

    const distFiles = await fs.readdir(outDir, { recursive: true });

    let js = '';
    let cssOutput = '';

    for (const file of distFiles) {
      const filePath = path.join(outDir, file.toString());
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        const content = await fs.readFile(filePath, 'utf-8');
        if (file.toString().endsWith('.js')) {
          js += content;
        } else if (file.toString().endsWith('.css')) {
          cssOutput += content;
        }
      }
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>${cssOutput}</style>
</head>
<body class="font-sans antialiased text-gray-900 bg-white">
  <div id="root"></div>
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@19",
      "react-dom/client": "https://esm.sh/react-dom@19/client"
    }
  }
  </script>
  <script type="module">${js}</script>
</body>
</html>`;

    return { js, css: cssOutput, html };
  } catch (err) {
    logger.error('Vite compilation failed', { error: err });
    throw err;
  } finally {
    await cleanupTempDir(tempDir);
  }
}
