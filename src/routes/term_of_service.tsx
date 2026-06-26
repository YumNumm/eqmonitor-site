import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { seo } from '~/utils/seo'
import { MarkdownArticle } from '~/components/MarkdownArticle'
import { renderMarkdown } from '~/lib/markdown'
import markdown from '~/content/term_of_service.md?raw'

const loadTermOfServiceHtml = createServerFn().handler(async () => {
  return renderMarkdown(markdown)
})

export const Route = createFileRoute('/term_of_service')({
  loader: () => loadTermOfServiceHtml(),
  head: () => ({
    meta: seo({
      title: '利用規約 | EQMonitor',
      description: '本サービスの利用規約について記載しています。',
    }),
  }),
  component: TermOfService,
})

function TermOfService() {
  const html = Route.useLoaderData()
  return <MarkdownArticle title="利用規約" html={html} />
}
