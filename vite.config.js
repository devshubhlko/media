import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      // Direct Pexels API proxy inside Vite dev server (Zero Node/Express backend needed!)
      '/pexels-api': {
        target: 'https://api.pexels.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/pexels-api/, ''),
        headers: {
          Authorization: '563492ad6f91700001000001baf1bd40e4ef4d9fbb65204f4377abf9'
        }
      }
    }
  }
});
