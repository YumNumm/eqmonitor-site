import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { seo } from '~/utils/seo'
import { MarkdownArticle } from '~/components/MarkdownArticle'
import { renderMarkdown } from '~/lib/markdown'
import markdown from '~/content/guideline.md?raw'

const loadGuidelineHtml = createServerFn().handler(async () => {
  return renderMarkdown(markdown)
})

export const Route = createFileRoute('/guideline')({
  loader: () => loadGuidelineHtml(),
  head: () => ({
    meta: seo({
      title: '気象庁ガイドライン対応状況 | EQMonitor',
      description:
        '緊急地震速報に関する気象庁のガイドラインに対するEQMonitorの対応状況について記載しています。',
    }),
  }),
  component: Guideline,
})

function Guideline() {
  const html = Route.useLoaderData()
  return (
    <MarkdownArticle
      title="緊急地震速報に関する気象庁のガイドライン対応状況 (仮)"
      html={html}
    />
  )
}
