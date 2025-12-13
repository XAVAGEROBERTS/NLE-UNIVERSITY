// vite.student.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/student', // Point to student source
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: '../../dist/student',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/student')
    }
  }
});