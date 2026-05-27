import { createFileRoute } from '@tanstack/react-router'
import { seo } from '~/utils/seo'
import { MarkdownArticle } from '~/components/MarkdownArticle'
import markdown from '~/content/privacy_policy.md?raw'

export const Route = createFileRoute('/privacy_policy')({
  head: () => ({
    meta: seo({
      title: 'プライバシーポリシー | EQMonitor',
      description: '本サービスのプライバシーポリシーについて記載しています。',
    }),
  }),
  component: PrivacyPolicy,
})

function PrivacyPolicy() {
  return <MarkdownArticle title="プライバシーポリシー" markdown={markdown} />
}
