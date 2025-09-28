import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: './src/client',
  build: {
    outDir: '../../dist/server/client',
    emptyOutDir: true
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/client'),
      '@/components': path.resolve(__dirname, './src/client/components'),
      '@/atoms': path.resolve(__dirname, './src/client/components/atoms'),
      '@/molecules': path.resolve(__dirname, './src/client/components/molecules'),
      '@/organisms': path.resolve(__dirname, './src/client/components/organisms'),
      '@/templates': path.resolve(__dirname, './src/client/components/templates'),
      '@/pages': path.resolve(__dirname, './src/client/components/pages'),
      '@/stores': path.resolve(__dirname, './src/client/stores'),
      '@/types': path.resolve(__dirname, './src/shared/types'),
      '@/lib': path.resolve(__dirname, './src/client/lib')
    }
  }
})