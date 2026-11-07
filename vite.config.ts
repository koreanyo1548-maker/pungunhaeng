import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`        → dist/ (index.html + hashed JS/CSS/PNG files)
// `npm run build:single` → dist-single/index.html with every asset inlined (for sharing one file)
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: single ? [viteSingleFile()] : [],
    css: { transformer: 'postcss' },
    build: {
      outDir: single ? 'dist-single' : 'dist',
      // keep CSS exactly as authored (no Lightning CSS rewriting of color-mix, nesting, etc.)
      cssMinify: false,
      assetsInlineLimit: single ? Number.MAX_SAFE_INTEGER : 0,
      chunkSizeWarningLimit: single ? 100000 : 500,
    },
  };
});
