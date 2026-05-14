import { defineConfig } from 'vite'
import reactSwc from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [reactSwc()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    // Proxy API calls to Next.js in dev — avoids CORS issue locally
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:   ['react', 'react-dom', 'react-router-dom'],
          query:    ['@tanstack/react-query'],
          ui:       ['framer-motion', 'lucide-react', 'recharts'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
