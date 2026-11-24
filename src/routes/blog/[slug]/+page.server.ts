import { error } from '@sveltejs/kit'
import { getPostBySlug } from '#lib/server/blog.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
  const post = await getPostBySlug(params.slug)
  if (!post) error(404, 'Not Found')
  return { post }
}
