import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite-plus';

import { adapter } from './adapter';
import { lint } from './lint';

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [tailwindcss(), sveltekit({ adapter: adapter() })],
  lint,
  fmt: {
    svelte: true,
    singleQuote: true,
    jsxSingleQuote: true,
    arrowParens: 'avoid',
    printWidth: 80,
    sortTailwindcss: { stylesheet: './src/app.css' },
    sortImports: {
      order: 'asc',
      groups: [
        ['type'],
        ['builtin'],
        ['external'],
        ['subpath', 'internal'],
        ['parent'],
        ['sibling'],
        ['index'],
      ],
    },
    ignorePatterns: [
      '.svelte-kit/**',
      'docs/**',
      'migrations/**',
      'src/lib/content/**',
      'static/**',
      'pnpm-lock.yaml',
      'mise.lock',
      'worker-configuration.d.ts',
      'workers/*/worker-configuration.d.ts',
      '*.yaml',
    ],
  },
});
