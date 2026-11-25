import { getAllPosts } from '#lib/server/blog.ts'
import type { PageServerLoad } from './$types'

export const prerender = true

export const load: PageServerLoad = () => {
  return { posts: getAllPosts() }
}
