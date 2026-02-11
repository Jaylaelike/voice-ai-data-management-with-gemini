import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          timeout: 120000,      // 2 minutes proxy timeout
        },
        '/heygen': {
          target: 'https://api.heygen.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/heygen/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const apiKey = env.HEYGEN_API_KEY || '';
              if (apiKey) {
                proxyReq.setHeader('x-api-key', apiKey);
              }
            });
          },
        },
      },
    },
  };
})
