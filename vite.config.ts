/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves the site from /quant-camp/.
export default defineConfig({
  base: '/quant-camp/',
  plugins: [react(), tailwindcss()],
  test: { environment: 'jsdom', include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'] },
});
