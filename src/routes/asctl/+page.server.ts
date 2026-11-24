import { renderMarkdown } from '#lib/server/markdown.ts'
import markdown from '#lib/content/specified_commercial_transactions_act.md?raw'
import type { PageServerLoad } from './$types'

export const prerender = true

export const load: PageServerLoad = async () => {
  return { html: await renderMarkdown(markdown) }
}
