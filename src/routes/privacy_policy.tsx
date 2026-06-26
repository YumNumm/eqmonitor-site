import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { seo } from '~/utils/seo'
import { MarkdownArticle } from '~/components/MarkdownArticle'
import { renderMarkdown } from '~/lib/markdown'
import markdown from '~/content/privacy_policy.md?raw'

const loadPrivacyPolicyHtml = createServerFn().handler(async () => {
  return renderMarkdown(markdown)
})

export const Route = createFileRoute('/privacy_policy')({
  loader: () => loadPrivacyPolicyHtml(),
  head: () => ({
    meta: seo({
      title: 'プライバシーポリシー | EQMonitor',
      description: '本サービスのプライバシーポリシーについて記載しています。',
    }),
  }),
  component: PrivacyPolicy,
})

function PrivacyPolicy() {
  const html = Route.useLoaderData()
  return <MarkdownArticle title="プライバシーポリシー" html={html} />
}
