import type { RegisterResult } from '#lib/betaTypes.ts';
import type { RequestHandler } from './$types';

import { error, json } from '@sveltejs/kit';
import * as v from 'valibot';

import { BetaRegistrationFormSchema } from '#lib/betaSchema.ts';
import {
  getBetaRegistrationByEmail,
  insertBetaRegistration,
  updateWorkflowId,
} from '#lib/server/beta-db.ts';
import { startBetaWorkflow } from '#lib/server/beta.ts';
import { appEnv } from '#lib/server/env.ts';
import { verifyTurnstile } from '#lib/server/turnstile.ts';

export const POST: RequestHandler = async ({ request }) => {
  const parsed = v.safeParse(
    BetaRegistrationFormSchema,
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    error(400, 'invalid_request');
  }
  const data = parsed.output;

  const respond = (result: RegisterResult) => json(result);

  const turnstileOk = await verifyTurnstile({
    secretKey: appEnv.TURNSTILE_SECRET_KEY,
    token: data.turnstileToken,
  });
  if (!turnstileOk) {
    return respond({ ok: false, error: 'turnstile_failed' });
  }

  const existing = await getBetaRegistrationByEmail(appEnv.DB, data.email);
  if (existing) {
    return respond({ ok: false, error: 'already_registered' });
  }

  const id = crypto.randomUUID();
  await insertBetaRegistration(appEnv.DB, {
    id,
    email: data.email,
    platform: data.platform,
  });

  const workflowId = await startBetaWorkflow({
    email: data.email,
    betaGroupId: appEnv.BETA_GROUP_ID,
    registrationId: id,
  });
  if (!workflowId) {
    return respond({ ok: false, error: 'workflow_failed' });
  }

  await updateWorkflowId(appEnv.DB, id, workflowId);

  return respond({ ok: true, id, workflowId });
};
