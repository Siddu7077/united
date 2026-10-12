import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The app calls the backend directly (see BASE in src/api.js), so no proxy is needed.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
});
