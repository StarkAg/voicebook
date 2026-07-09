import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_MESH_BASE_URL || 'https://api.meshapi.ai/v1'
  const key = env.VITE_MESH_API_KEY

  return {
    plugins: [react(), tailwindcss()],
    // Mesh's API sends no CORS headers, so the browser can't call it directly.
    // Route /mesh/* through the dev server (same-origin) and attach the key here,
    // keeping it off the client.
    server: {
      proxy: {
        '/mesh': {
          target,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/mesh/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (key) proxyReq.setHeader('Authorization', `Bearer ${key}`)
            })
          },
        },
      },
    },
  }
})
