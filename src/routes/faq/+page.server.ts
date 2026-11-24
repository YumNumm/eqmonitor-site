import { getAllRenderedFaqSections } from '#lib/server/faq.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
  return { sections: await getAllRenderedFaqSections() }
}
