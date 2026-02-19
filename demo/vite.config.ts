import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    resolve: {
        alias: {
            'idaztian': resolve(__dirname, '../packages/idaztian/src/index.ts'),
        },
    },
    server: {
        host: '0.0.0.0',
        port: 5174,
    },
});
