import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packageRoot = fileURLToPath(new URL('../', import.meta.url))
    .replaceAll('\\', '/')
    .replace(/\/$/, '');
const hostRoot = fileURLToPath(new URL('../../rechi-os/', import.meta.url))
    .replaceAll('\\', '/')
    .replace(/\/$/, '');
const hostRequire = createRequire(`${hostRoot}/package.json`);
const { default: react } = await import(
    pathToFileURL(hostRequire.resolve('@vitejs/plugin-react')).href
);

export default {
    root: packageRoot,
    plugins: [react()],
    server: { fs: { allow: [packageRoot, hostRoot] } },
    resolve: {
        alias: [
            'react',
            'react-dom',
            '@inertiajs/react',
            '@xyflow/react',
            '@testing-library/react',
            'vitest',
        ].map((name) => ({
            find: name,
            replacement: `${hostRoot}/node_modules/${name}`,
        })),
    },
    test: {
        environment: 'jsdom',
        setupFiles: [`${hostRoot}/resources/js/tests/setup.ts`],
        include: ['resources/js/tests/**/*.test.{ts,tsx}'],
    },
};
