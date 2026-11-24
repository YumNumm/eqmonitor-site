import { json } from '@sveltejs/kit'
import { fetchBetaWorkflowStatus } from '#lib/server/beta.ts'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ params }) => {
  return json(await fetchBetaWorkflowStatus(params.workflowId))
}
