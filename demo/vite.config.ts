import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    resolve: {
        alias: {
            'idaztian': resolve(__dirname, '../packages/idaztian/src/index.ts'),
        },
    },
    server: {
        port: 5173,
    },
});
