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
            name: 'Idaztian',
            formats: ['es', 'umd'],
            fileName: (format) => format === 'es' ? 'idaztian.js' : 'idaztian.umd.cjs',
        },
        rollupOptions: {
            // For ESM build, externalize CM6 deps so host apps can share them
            // For UMD build, bundle everything
            external: (id) => {
                if (process.env.BUILD_FORMAT === 'umd') return false;
                return id.startsWith('@codemirror/') || id.startsWith('@lezer/');
            },
        },
        sourcemap: true,
        cssCodeSplit: false,
    },
});
