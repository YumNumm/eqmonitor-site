import matter from 'gray-matter'
import { renderMarkdown } from './markdown'

export interface BlogPost {
  slug: string
  title: string
  date: string
  description: string
  tags: string[]
  image?: string
}

export interface BlogPostWithHtml extends BlogPost {
  html: string
}

const blogModules = import.meta.glob('../content/blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function slugFromPath(path: string): string {
  const filename = path.split('/').pop() ?? ''
  return filename.replace(/\.md$/, '')
}

function parseFrontmatter(raw: string, slug: string): BlogPost {
  const { data } = matter(raw)
  return {
    slug,
    title: data.title,
    date: data.date instanceof Date ? data.date.toISOString().split('T')[0] : String(data.date),
    description: data.description,
    tags: data.tags ?? [],
    image: data.image ?? undefined,
  }
}

export function getAllPosts(): BlogPost[] {
  const posts: BlogPost[] = []
  for (const [path, raw] of Object.entries(blogModules)) {
    const slug = slugFromPath(path)
    posts.push(parseFrontmatter(raw, slug))
  }
  posts.sort((a, b) => (a.date > b.date ? -1 : 1))
  return posts
}

export async function getPostBySlug(slug: string): Promise<BlogPostWithHtml | null> {
  const entry = Object.entries(blogModules).find(
    ([path]) => slugFromPath(path) === slug,
  )
  if (!entry) return null

  const raw = entry[1]
  const { content } = matter(raw)
  const post = parseFrontmatter(raw, slug)
  const html = await renderMarkdown(content)

  return { ...post, html }
}
