import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: './',
    resolve: {
        alias: {
            'idaztian': resolve(__dirname, '../../packages/idaztian/src/index.ts'),
        },
    },
});
