import { createServerFn } from '@tanstack/react-start'
import * as v from 'valibot'
import { hc } from 'hono/client'
import type { AppType } from 'eqmonitor-beta-worker'
import { appEnv } from './env'
import {
  insertBetaRegistration,
  updateWorkflowId,
  getBetaRegistrationByEmail,
} from './beta-db'
import { verifyTurnstile } from './turnstile'
import { BetaRegistrationFormSchema } from '~/lib/betaSchema'

type RegisterResult =
  | { ok: true; id: string; workflowId: string }
  | { ok: false; error: 'turnstile_failed' | 'already_registered' | 'workflow_failed' }

export const registerBeta = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => v.parse(BetaRegistrationFormSchema, d))
  .handler(async ({ data }): Promise<RegisterResult> => {
    const turnstileOk = await verifyTurnstile({
      secretKey: appEnv.TURNSTILE_SECRET_KEY,
      token: data.turnstileToken,
    })
    if (!turnstileOk) {
      return { ok: false, error: 'turnstile_failed' }
    }

    const existing = await getBetaRegistrationByEmail(appEnv.DB, data.email)
    if (existing) {
      return { ok: false, error: 'already_registered' }
    }

    const id = crypto.randomUUID()
    await insertBetaRegistration(appEnv.DB, {
      id,
      email: data.email,
      platform: data.platform,
    })

    const client = hc<AppType>('http://dummy', {
      fetch: appEnv.BETA_WORKER.fetch.bind(appEnv.BETA_WORKER),
    })
    const res = await client.register.$post({
      json: {
        email: data.email,
        betaGroupId: appEnv.BETA_GROUP_ID,
        registrationId: id,
      },
    })

    if (!res.ok) {
      return { ok: false, error: 'workflow_failed' }
    }

    const result = await res.json()
    await updateWorkflowId(appEnv.DB, id, result.workflowId)

    return { ok: true, id, workflowId: result.workflowId }
  })

const BetaStatusInputSchema = v.object({
  workflowId: v.pipe(v.string(), v.minLength(1)),
})

export const getBetaStatus = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => v.parse(BetaStatusInputSchema, d))
  .handler(async ({ data }) => {
    const client = hc<AppType>('http://dummy', {
      fetch: appEnv.BETA_WORKER.fetch.bind(appEnv.BETA_WORKER),
    })
    const res = await client.status[':workflowId'].$get({
      param: { workflowId: data.workflowId },
    })

    return await res.json()
  })
