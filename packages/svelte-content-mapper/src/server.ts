import { runContentMapper } from 'ts-content-mapper';

import { transform } from './transform.ts';

// svelte2tsxはJavaScriptの文字列の位置（UTF-16）で対応を返す
runContentMapper({
  diagnosticSource: 'svelte',
  positionEncoding: 'utf-16',
  transform,
});
