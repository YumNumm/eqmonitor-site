import { appEnv } from '#lib/server/env.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = () => {
  return { siteKey: appEnv.TURNSTILE_SITE_KEY }
}
