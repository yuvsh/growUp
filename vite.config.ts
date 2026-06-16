import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Recharts is lazy (only the Growth chunk pulls it in), so its vendor chunk
    // exceeding 500 kB is expected and fine — bump the warning limit to avoid noise.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Split heavy third-party deps into their own vendor chunks so they can be
        // fetched/cached independently of app code:
        //  - recharts: only needed by the (lazy) Growth charts.
        //  - supabase: the auth/data client, loaded with the shell.
        manualChunks: {
          recharts: ['recharts'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
