import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite-plus'
import { adapter } from './adapter'

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [tailwindcss(), sveltekit({ adapter: adapter() })],
  lint: {
    ignorePatterns: ['.svelte-kit/**', 'workers/**', 'worker-configuration.d.ts'],
  },
})
