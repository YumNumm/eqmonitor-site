import matter from 'gray-matter'
import { renderMarkdown } from './markdown'

export interface FaqSectionMeta {
  id: string
  title: string
  description: string
  order: number
}

export interface FaqItemMeta {
  id: string
  sectionId: string
  question: string
  order: number
}

export interface RenderedFaqItem extends FaqItemMeta {
  answerHtml: string
}

export interface RenderedFaqSection extends FaqSectionMeta {
  descriptionHtml: string
  items: RenderedFaqItem[]
}

const faqFiles = import.meta.glob('../content/faq/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function sectionIdFromPath(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 2]
}

function itemIdFromPath(path: string): string {
  return (path.split('/').pop() ?? '').replace(/\.md$/, '')
}

function isIndexFile(path: string): boolean {
  return path.endsWith('/_index.md')
}

export function getAllFaqSections(): FaqSectionMeta[] {
  return Object.entries(faqFiles)
    .filter(([path]) => isIndexFile(path))
    .map(([path, raw]) => {
      const { data } = matter(raw)
      return {
        id: sectionIdFromPath(path),
        title: String(data.title ?? ''),
        description: String(data.description ?? ''),
        order: Number(data.order ?? 0),
      }
    })
    .sort((a, b) => a.order - b.order)
}

export async function getAllRenderedFaqSections(): Promise<RenderedFaqSection[]> {
  const sections = getAllFaqSections()

  return Promise.all(
    sections.map(async (section) => {
      const descriptionHtml = await renderMarkdown(section.description)

      const itemPromises = Object.entries(faqFiles)
        .filter(
          ([path]) =>
            !isIndexFile(path) && sectionIdFromPath(path) === section.id,
        )
        .map(async ([path, raw]) => {
          const { data, content } = matter(raw)
          const answerHtml = await renderMarkdown(content)
          return {
            id: itemIdFromPath(path),
            sectionId: section.id,
            question: String(data.question ?? ''),
            order: Number(data.order ?? 0),
            answerHtml,
          } satisfies RenderedFaqItem
        })

      const items = (await Promise.all(itemPromises)).sort(
        (a, b) => a.order - b.order,
      )

      return {
        ...section,
        descriptionHtml,
        items,
      } satisfies RenderedFaqSection
    }),
  )
}
