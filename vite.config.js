import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/orca-mindmap-local.ts',
      formats: ['es'],
      fileName: () => 'index.js'
    },
    rollupOptions: {
      external: ['react', 'valtio'],
      // 不排除markmap相关的包，让它们被打包进最终文件
    },
    sourcemap: true,
    minify: false
  }
});