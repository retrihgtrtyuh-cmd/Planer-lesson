import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const rootDir =
  typeof import.meta.dirname === 'string'
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      {
        name: 'serve-and-copy-modular-static-files',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const rawUrl = (req.url || '').split('?')[0];

            const jsMatch = rawUrl.match(/\/?js\/(store|calendar|ui|app)\.js$/);
            if (jsMatch) {
              const filePath = path.resolve(rootDir, 'js', `${jsMatch[1]}.js`);
              if (fs.existsSync(filePath)) {
                res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
                res.setHeader('Cache-Control', 'no-store');
                res.end(fs.readFileSync(filePath, 'utf-8'));
                return;
              }
            }

            if (/\/?styles\.css$/.test(rawUrl)) {
              const cssPath = path.resolve(rootDir, 'styles.css');
              if (fs.existsSync(cssPath)) {
                res.setHeader('Content-Type', 'text/css; charset=utf-8');
                res.setHeader('Cache-Control', 'no-store');
                res.end(fs.readFileSync(cssPath, 'utf-8'));
                return;
              }
            }

            if (/\/?manifest\.json$/.test(rawUrl)) {
              const manifestPath = path.resolve(rootDir, 'manifest.json');
              if (fs.existsSync(manifestPath)) {
                res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
                res.setHeader('Cache-Control', 'no-store');
                res.end(fs.readFileSync(manifestPath, 'utf-8'));
                return;
              }
            }

            next();
          });
        },
        closeBundle() {
          const outDir = path.resolve(rootDir, 'dist');
          fs.mkdirSync(path.join(outDir, 'js'), { recursive: true });

          // Copy index.html, styles.css, manifest.json, and modular js/*.js files into dist/
          for (const file of ['index.html', 'styles.css', 'manifest.json']) {
            const srcFile = path.resolve(rootDir, file);
            if (fs.existsSync(srcFile)) {
              fs.copyFileSync(srcFile, path.join(outDir, file));
            }
          }

          for (const jsFile of ['store.js', 'calendar.js', 'ui.js', 'app.js']) {
            const srcJs = path.resolve(rootDir, 'js', jsFile);
            if (fs.existsSync(srcJs)) {
              fs.copyFileSync(srcJs, path.join(outDir, 'js', jsFile));
            }
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
