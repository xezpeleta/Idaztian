import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: './',
    resolve: {
        alias: {
            'idaztian/style.css': resolve(__dirname, '../../packages/idaztian/dist/idaztian.css'),
            'idaztian': resolve(__dirname, '../../packages/idaztian/src/index.ts'),
        },
    },
});
