import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      {
        name: 'copy-modular-static-files',
        closeBundle() {
          const outDir = path.resolve(__dirname, 'dist');
          fs.mkdirSync(path.join(outDir, 'js'), { recursive: true });

          // Copy index.html, styles.css, manifest.json, and modular js/*.js files into dist/
          for (const file of ['index.html', 'styles.css', 'manifest.json']) {
            const srcFile = path.resolve(__dirname, file);
            if (fs.existsSync(srcFile)) {
              fs.copyFileSync(srcFile, path.join(outDir, file));
            }
          }

          for (const jsFile of ['store.js', 'calendar.js', 'ui.js', 'app.js']) {
            const srcJs = path.resolve(__dirname, 'js', jsFile);
            if (fs.existsSync(srcJs)) {
              fs.copyFileSync(srcJs, path.join(outDir, 'js', jsFile));
            }
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
