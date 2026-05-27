import { createFileRoute } from '@tanstack/react-router'
import { seo } from '~/utils/seo'
import { MarkdownArticle } from '~/components/MarkdownArticle'
import markdown from '~/content/specified_commercial_transactions_act.md?raw'

export const Route = createFileRoute('/asctl')({
  head: () => ({
    meta: seo({
      title: '特定商取引法に基づく表記 | EQMonitor',
      description:
        '特定商取引法に基づく表記を記載しています。',
    }),
  }),
  component: SpecifiedCommercialTransactionsAct,
})

function SpecifiedCommercialTransactionsAct() {
  return (
    <MarkdownArticle
      title="特定商取引法に基づく表記"
      markdown={markdown}
    />
  )
}
