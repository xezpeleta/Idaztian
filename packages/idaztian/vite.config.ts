import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        dts({
            include: ['src'],
            rollupTypes: true,
        }),
    ],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'idaztian',
            formats: ['es', 'umd'],
            fileName: (format) => format === 'es' ? 'idaztian.js' : 'idaztian.umd.cjs',
        },
        rollupOptions: {
            // Bundle all dependencies for both ESM and UMD so it works out of the box
            external: [],
        },
        sourcemap: true,
        cssCodeSplit: false,
    },
});
