import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { execSync } from 'child_process'

// Get git commit info
let gitCommit = 'unknown';
let gitBranch = 'unknown';
try {
  gitCommit = execSync('git rev-parse --short HEAD').toString().trim();
  gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
} catch (e) {
  console.warn('Git info not available');
}

export default defineConfig({
  plugins: [react()],
  root: './src/client',
  define: {
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
    'import.meta.env.VITE_GIT_COMMIT': JSON.stringify(gitCommit),
    'import.meta.env.VITE_GIT_BRANCH': JSON.stringify(gitBranch),
  },
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