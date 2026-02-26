import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./__tests__/setup.ts'],
        retry: 3, // HRMS-404: Flaky test retry policy
        alias: {
            '@': resolve(__dirname, './')
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            // HRMS-405: Coverage thresholds
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 80,
                statements: 80
            }
        },
    },
})
