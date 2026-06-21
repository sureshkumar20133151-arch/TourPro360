import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: './src/main.js',
      name: 'TourPro360Widget',
      fileName: () => 'widget.js',
      formats: ['iife']
    },
    rollupOptions: {
      external: []
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
})
