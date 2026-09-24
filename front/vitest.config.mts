import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/unit/**/*.test.{ts,tsx}'],
        css: false,
        coverage: {
            provider: 'v8',
            include: ['components/**', 'lib/**', 'hooks/**', 'stores/**'],
            exclude: ['lib/server-api.ts'],
        },
    },
});
