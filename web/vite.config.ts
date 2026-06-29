import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // forward API calls to the server, stripping the /api prefix
      '/api': {
        // 127.0.0.1 (not localhost) avoids Vite resolving to IPv6 ::1 while the
        // server listens on IPv4, which surfaces as a 502 from the proxy.
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
