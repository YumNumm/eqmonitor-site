import { createFileRoute } from '@tanstack/react-router'
import { seo } from '~/utils/seo'
import { MarkdownArticle } from '~/components/MarkdownArticle'
import markdown from '~/content/guideline.md?raw'

export const Route = createFileRoute('/guideline')({
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
  return (
    <MarkdownArticle
      title="緊急地震速報に関する気象庁のガイドライン対応状況 (仮)"
      markdown={markdown}
    />
  )
}
