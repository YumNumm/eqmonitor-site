import type { RequestHandler } from './$types';

import { json } from '@sveltejs/kit';

import { fetchBetaWorkflowStatus } from '#lib/server/beta.ts';

export const GET: RequestHandler = async ({ params }) => {
  return json(await fetchBetaWorkflowStatus(params.workflowId));
};
