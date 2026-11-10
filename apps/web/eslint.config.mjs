import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const currentDir = dirname(fileURLToPath(import.meta.url));

// eslint-config-next is still eslintrc-shaped, so FlatCompat bridges it to flat config.
const compat = new FlatCompat({ baseDirectory: currentDir });

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
];
