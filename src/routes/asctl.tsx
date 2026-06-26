import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { seo } from '~/utils/seo'
import { MarkdownArticle } from '~/components/MarkdownArticle'
import { renderMarkdown } from '~/lib/markdown'
import markdown from '~/content/specified_commercial_transactions_act.md?raw'

const loadAsctlHtml = createServerFn().handler(async () => {
  return renderMarkdown(markdown)
})

export const Route = createFileRoute('/asctl')({
  loader: () => loadAsctlHtml(),
  head: () => ({
    meta: seo({
      title: '特定商取引法に基づく表記 | EQMonitor',
      description: '特定商取引法に基づく表記を記載しています。',
    }),
  }),
  component: SpecifiedCommercialTransactionsAct,
})

function SpecifiedCommercialTransactionsAct() {
  const html = Route.useLoaderData()
  return (
    <MarkdownArticle
      title="特定商取引法に基づく表記"
      html={html}
    />
  )
}
