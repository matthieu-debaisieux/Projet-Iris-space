import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      // `@/…` pointe vers `src/…` (évite les ../../)
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      // En dev, les appels `/api/...` sont redirigés vers le back
      proxy: {
        '/api': { target: env.VITE_BACKEND_URL || 'http://localhost:3000', changeOrigin: true },
      },
    },
  };
});
