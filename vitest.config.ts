import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'dist/',
        '**/*.d.ts',
        'src/types/',
        'src/**/*.types.ts',
        'src/**/types.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/config/',
        '**/*.config.*',
        'vite.config.*',
        'vitest.config.*',
        'eslint.config.*',
        'tailwind.config.*',
        'postcss.config.*',
      ],
    },
  },
})