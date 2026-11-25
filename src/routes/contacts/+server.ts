import type { RequestHandler } from './$types';

import { redirect } from '@sveltejs/kit';

export const GET: RequestHandler = ({ url }) => {
  redirect(301, `/contact${url.search}`);
};
