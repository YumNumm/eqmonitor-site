import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { render } from '@react-email/render'
import { BetaRegisteredEmail } from '../emails/beta-registered'

/**
 * react-email テンプレートを静的 HTML へレンダリングし、Worker から import 可能な
 * TS モジュールとして `src/emails/` 配下に出力する。
 *
 * 実行: `pnpm build:emails`
 */

const __dirname = dirname(fileURLToPath(import.meta.url))

const targets = [
  {
    component: BetaRegisteredEmail,
    exportName: 'betaRegisteredHtml',
    outFile: 'beta-registered.ts',
  },
] as const

const outDir = resolve(__dirname, '../src/emails')
mkdirSync(outDir, { recursive: true })

for (const { component, exportName, outFile } of targets) {
  const html = await render(createElement(component), { pretty: false })

  const contents =
    `// このファイルは \`pnpm build:emails\` により自動生成されます。\n` +
    `// 直接編集せず、emails/*.tsx を編集してから再生成してください。\n` +
    `export const ${exportName} = ${JSON.stringify(html)}\n`

  const outPath = resolve(outDir, outFile)
  writeFileSync(outPath, contents)
  console.log(`generated ${outFile} (${html.length} bytes of HTML)`)
}
