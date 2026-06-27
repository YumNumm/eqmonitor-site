import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { seo } from '~/utils/seo'
import { getPostBySlug } from '~/lib/blog'

const loadBlogPost = createServerFn()
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const post = await getPostBySlug(slug)
    if (!post) throw notFound()
    return post
  })

export const Route = createFileRoute('/blog/$slug')({
  loader: ({ params }) => loadBlogPost({ data: params.slug }),
  head: ({ loaderData }) => ({
    meta: loaderData
      ? seo({
          title: `${loaderData.title} | EQMonitor Blog`,
          description: loaderData.description,
          image: `https://eqmonitor.app/api/og?title=${encodeURIComponent(loaderData.title)}${loaderData.image ? `&image=${encodeURIComponent(loaderData.image.startsWith('http') ? loaderData.image : `https://eqmonitor.app${loaderData.image}`)}` : ''}`,
        })
      : [],
  }),
  component: BlogPost,
})

function BlogPost() {
  const post = Route.useLoaderData()

  return (
    <div className="max-w-[1024px] mx-auto">
      <div className="pt-8 pb-4 px-8">
        <p className="text-base-content/60 text-sm text-center">{post.date}</p>
        <h1 className="text-4xl font-bold text-center mt-2">{post.title}</h1>
        {post.tags.length > 0 && (
          <div className="flex justify-center gap-2 mt-4">
            {post.tags.map((tag) => (
              <span key={tag} className="badge badge-sm badge-outline">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <article
        className="prose prose-invert max-w-none p-8"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: 信頼できる自リポジトリ内 markdown のみ
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
    </div>
  )
}
