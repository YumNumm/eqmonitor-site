import type { Adapter } from '@sveltejs/kit';

import fs from 'node:fs';
import path from 'node:path';

import cloudflare from '@sveltejs/adapter-cloudflare';
import { build } from 'vite';

// adapter-cloudflare が生成する Worker は fetch しか export しないため、
// projects 同期用の scheduled ハンドラを別途バンドルして合成する
export function adapter(): Adapter {
  const base = cloudflare();
  return {
    ...base,
    async adapt(builder) {
      await base.adapt(builder);

      const workerDir = path.join(
        builder.getBuildDirectory('cloudflare'),
        'worker',
      );
      await build({
        configFile: false,
        logLevel: 'warn',
        ssr: { noExternal: true, target: 'webworker' },
        build: {
          ssr: path.resolve('src/scheduled.ts'),
          outDir: path.join(workerDir, 'scheduled'),
          emptyOutDir: true,
          minify: false,
          rolldownOptions: {
            external: [/^cloudflare:/],
            output: { entryFileNames: 'index.js' },
          },
        },
      });

      fs.renameSync(
        path.join(workerDir, 'index.js'),
        path.join(workerDir, 'sveltekit.js'),
      );
      fs.writeFileSync(
        path.join(workerDir, 'index.js'),
        [
          "import app from './sveltekit.js'",
          "import { scheduled } from './scheduled/index.js'",
          'export default { ...app, scheduled }',
          '',
        ].join('\n'),
      );
    },
  };
}
