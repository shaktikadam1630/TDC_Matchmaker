import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In dev, forward /api to the local backend so no CORS setup is needed.
    proxy: { '/api': 'http://localhost:4000' },
  },
});
