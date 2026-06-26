import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { seo } from '~/utils/seo'
import { getAllPosts } from '~/lib/blog'

const loadBlogPosts = createServerFn().handler(async () => {
  return getAllPosts()
})

export const Route = createFileRoute('/blog/')({
  loader: () => loadBlogPosts(),
  head: () => ({
    meta: seo({
      title: 'Blog | EQMonitor',
      description: 'EQMonitor の技術ブログ',
    }),
  }),
  component: BlogIndex,
})

function BlogIndex() {
  const posts = Route.useLoaderData()

  return (
    <div className="max-w-[1024px] mx-auto p-8">
      <h1 className="text-4xl font-bold text-center pt-8 pb-8">Blog</h1>
      <div className="space-y-6">
        {posts.map((post) => (
          <Link
            key={post.slug}
            to="/blog/$slug"
            params={{ slug: post.slug }}
            className="block"
          >
            <article className="card bg-base-200/50 border border-base-300 hover:border-primary/50 transition-colors">
              <div className="card-body">
                <h2 className="card-title text-xl">{post.title}</h2>
                <p className="text-base-content/60 text-sm">{post.date}</p>
                <p className="text-base-content/80">{post.description}</p>
                {post.tags.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="badge badge-sm badge-outline"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  )
}
