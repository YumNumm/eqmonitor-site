import * as v from 'valibot';

import { appEnv } from './env';

const RegisterResponseSchema = v.object({
  ok: v.literal(true),
  workflowId: v.string(),
});

export async function startBetaWorkflow(params: {
  email: string;
  betaGroupId: string;
  registrationId: string;
}): Promise<string | null> {
  const res = await appEnv.BETA_WORKER.fetch(
    'http://beta-worker.internal/register',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
  );
  if (!res.ok) return null;
  const parsed = v.safeParse(RegisterResponseSchema, await res.json());
  return parsed.success ? parsed.output.workflowId : null;
}

export async function fetchBetaWorkflowStatus(
  workflowId: string,
): Promise<unknown> {
  const res = await appEnv.BETA_WORKER.fetch(
    `http://beta-worker.internal/status/${encodeURIComponent(workflowId)}`,
  );
  return await res.json();
}
