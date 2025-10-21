import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: '.',
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                frameCalculator: path.resolve(__dirname, 'frame-calculator.html'),
                printCalculator: path.resolve(__dirname, 'print-calculator.html'),
                orderForm: path.resolve(__dirname, 'order-form.html'),
            },
        },
        sourcemap: true,
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true, // Remove console.* in production
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.debug']
            },
            format: {
                comments: false,
            },
        },
    },
    server: {
        port: 5173,
        open: true,
        cors: true,
    },
    preview: {
        port: 4173,
        open: true,
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './tests/setup.js',
        include: ['tests/unit/**/*.test.js'], // Only run unit tests with Vitest
        exclude: ['tests/e2e/**/*'], // Exclude E2E tests (run with Playwright)
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            exclude: [
                'node_modules/',
                'tests/',
                '**/*.test.js',
                '**/*.spec.js',
                'dist/',
                'lib/',
            ],
            all: true,
            lines: 80,
            functions: 80,
            branches: 80,
            statements: 80,
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './js'),
        },
    },
});
