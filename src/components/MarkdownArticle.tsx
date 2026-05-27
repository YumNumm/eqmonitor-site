import { marked } from 'marked'

export function MarkdownArticle({
  title,
  markdown,
}: {
  title: string
  markdown: string
}) {
  // markdown はリポジトリ内の信頼できる静的コンテンツ
  const html = marked.parse(markdown, { async: false })

  return (
    <div className="max-w-[1024px] mx-auto">
      <h1 className="text-4xl font-bold text-center pt-8 pb-4">{title}</h1>
      <article
        className="prose md:prose-lg lg:prose-xl prose-invert max-w-none p-8"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: 信頼できる自リポジトリ内 markdown のみ
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
