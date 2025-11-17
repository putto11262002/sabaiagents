/**
 * Vite development server integration for Express
 * Handles both development (with HMR) and production (static files) modes
 */

import express, { type Express, Request, Response, NextFunction } from 'express';
import { createServer as createViteServer, ViteDevServer } from 'vite';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '../..');

const isDev = process.env.NODE_ENV !== 'production';

interface ManifestChunk {
  file: string;
  name?: string;
  src?: string;
  isEntry?: boolean;
  isDynamicEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
  css?: string[];
  assets?: string[];
}

type Manifest = Record<string, ManifestChunk>;

/**
 * Configure Vite middleware for Express in development mode
 */
export async function setupViteDev(app: Express): Promise<ViteDevServer> {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: {
        // Use the same port as the Express server
        port: 3000,
      },
    },
    appType: 'custom',
  });

  // Use Vite's middleware for handling module transformation and HMR
  app.use(vite.middlewares);

  // Serve index.html with Vite transformations
  app.use('*', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const url = req.originalUrl;

      // Skip API routes
      if (url.startsWith('/api')) {
        return next();
      }

      // Read the index.html
      let template = readFileSync(resolve(root, 'index.html'), 'utf-8');

      // Apply Vite transformations to the HTML
      template = await vite.transformIndexHtml(url, template);

      // Inject React Refresh preamble for HMR
      const reactRefreshScript = `
<script type="module">
  import RefreshRuntime from '/@react-refresh'
  RefreshRuntime.injectIntoGlobalHook(window)
  window.$RefreshReg$ = () => {}
  window.$RefreshSig$ = () => (type) => type
  window.__vite_plugin_react_preamble_installed__ = true
</script>`;

      // Inject before the first script tag
      template = template.replace(
        '<script',
        `${reactRefreshScript}\n    <script`
      );

      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (error) {
      if (error instanceof Error) {
        vite.ssrFixStacktrace(error);
        next(error);
      }
    }
  });

  return vite;
}

/**
 * Configure static file serving for production mode
 */
export function setupProd(app: Express): void {
  const distPath = resolve(root, 'dist/client');
  const manifestPath = resolve(distPath, '.vite/manifest.json');

  // Serve static assets
  app.use(
    express.static(distPath, {
      index: false, // Don't automatically serve index.html
      maxAge: '1y', // Cache static assets for a year
    })
  );

  // Load the manifest
  let manifest: Manifest = {};
  if (existsSync(manifestPath)) {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  }

  // Serve index.html for all non-API routes
  app.use('*', (req: Request, res: Response, next: NextFunction) => {
    try {
      const url = req.originalUrl;

      // Skip API routes
      if (url.startsWith('/api')) {
        return next();
      }

      // Read the built index.html
      const indexPath = resolve(distPath, 'index.html');
      if (!existsSync(indexPath)) {
        return next(new Error('index.html not found. Run `npm run build` first.'));
      }

      let html = readFileSync(indexPath, 'utf-8');

      // Inject scripts and styles from manifest
      const entry = manifest['src/frontend/app.tsx'];
      if (entry) {
        const { scripts, styles } = resolveManifestEntry(entry, manifest);

        // Inject styles before </head>
        if (styles.length > 0) {
          const styleLinks = styles
            .map((file) => `<link rel="stylesheet" href="/${file}">`)
            .join('\n    ');
          html = html.replace('</head>', `${styleLinks}\n  </head>`);
        }

        // Inject scripts before </body>
        if (scripts.length > 0) {
          const scriptTags = scripts
            .map((file) => `<script type="module" src="/${file}"></script>`)
            .join('\n    ');
          html = html.replace('</body>', `${scriptTags}\n  </body>`);
        }
      }

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (error) {
      next(error);
    }
  });
}

/**
 * Resolve all scripts and styles for a manifest entry
 */
function resolveManifestEntry(
  entry: ManifestChunk,
  manifest: Manifest
): { scripts: string[]; styles: string[] } {
  const scripts: string[] = [];
  const styles: string[] = [];
  const visited = new Set<string>();

  function traverse(chunk: ManifestChunk) {
    // Avoid infinite loops
    const key = chunk.file;
    if (visited.has(key)) return;
    visited.add(key);

    // Add CSS files
    if (chunk.css) {
      styles.push(...chunk.css);
    }

    // Add the chunk file itself if it's an entry
    if (chunk.isEntry || chunk.isDynamicEntry) {
      scripts.push(chunk.file);
    }

    // Recursively process imports
    if (chunk.imports) {
      for (const importKey of chunk.imports) {
        const importedChunk = manifest[importKey];
        if (importedChunk) {
          traverse(importedChunk);
        }
      }
    }
  }

  traverse(entry);

  return { scripts, styles };
}

/**
 * Setup Vite integration based on environment
 */
export async function setupVite(app: Express): Promise<ViteDevServer | null> {
  if (isDev) {
    console.log('🔧 Running in development mode with Vite HMR');
    return await setupViteDev(app);
  } else {
    console.log('📦 Running in production mode with static files');
    setupProd(app);
    return null;
  }
}
