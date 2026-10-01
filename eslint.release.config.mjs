import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        files: ['scripts/*.cjs', 'test/release.test.cjs'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: Object.fromEntries(['fetch', 'AbortSignal', 'Buffer', 'URL', 'setTimeout', 'process', 'console', '__dirname'].map(name => [name, 'readonly'])),
        },
    },
];
