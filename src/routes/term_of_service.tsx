import { createFileRoute } from '@tanstack/react-router'
import { seo } from '~/utils/seo'
import { MarkdownArticle } from '~/components/MarkdownArticle'
import markdown from '~/content/term_of_service.md?raw'

export const Route = createFileRoute('/term_of_service')({
  head: () => ({
    meta: seo({
      title: '利用規約 | EQMonitor',
      description: '本サービスの利用規約について記載しています。',
    }),
  }),
  component: TermOfService,
})

function TermOfService() {
  return <MarkdownArticle title="利用規約" markdown={markdown} />
}
