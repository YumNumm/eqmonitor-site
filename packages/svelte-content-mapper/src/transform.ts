import type { TransformParams, TransformResult } from 'ts-content-mapper';

import { readFile } from 'node:fs/promises';

import { VERSION, parse } from 'svelte/compiler';
import { svelte2tsx } from 'svelte2tsx';

import { toSpanMappings } from './mappings.ts';

const extension = '.ts';
const typescriptScript = /<script[^>]*\blang=["'](?:ts|typescript)["']/u;
const failedCode = 1;

// 壊れたコンポーネントをimportする側でも、default exportは解決できるようにする
const fallback = 'const component: any = {};\nexport default component;\n';

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// svelte-packageで作られたライブラリは、コンポーネントの隣に型定義を置く。ライブラリの中身は検査しない
async function declarationOf(
  fileName: string,
): Promise<TransformResult | undefined> {
  if (!fileName.includes('/node_modules/')) return undefined;
  try {
    const declaration = await readFile(`${fileName}.d.ts`, 'utf-8');
    return { text: `// @ts-nocheck\n${declaration}`, extension };
  } catch {
    // 型定義がないライブラリは、中身を変換する
    return undefined;
  }
}

function convert({ content, fileName }: TransformParams): TransformResult {
  try {
    const { code, map } = svelte2tsx(content, {
      filename: fileName,
      isTsFile: typescriptScript.test(content),
      mode: 'ts',
      emitOnTemplateError: true,
      parse,
      version: VERSION,
    });
    return {
      text: code,
      extension,
      mappings: toSpanMappings(content, code, map.mappings),
    };
  } catch (error) {
    return {
      text: fallback,
      extension,
      diagnostics: [
        {
          messageText: messageOf(error),
          start: 0,
          length: 0,
          code: failedCode,
        },
      ],
    };
  }
}

export async function transform(
  params: TransformParams,
): Promise<TransformResult> {
  return (await declarationOf(params.fileName)) ?? convert(params);
}
