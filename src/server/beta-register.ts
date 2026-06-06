import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import * as v from 'valibot'
import { hc } from 'hono/client'
import type { AppType } from 'eqmonitor-beta-worker'
import { getAuth } from './auth'
import { appEnv } from './env'
import {
  insertBetaRegistration,
  updateWorkflowId,
  getBetaRegistrationByUserId,
} from './beta-db'
import { BetaRegistrationFormSchema } from '~/lib/betaSchema'

type RegisterResult =
  | { ok: true; id: string; workflowId: string }
  | { ok: false; error: 'unauthorized' | 'already_registered' | 'workflow_failed' }

export const registerBeta = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => v.parse(BetaRegistrationFormSchema, d))
  .handler(async ({ data }): Promise<RegisterResult> => {
    const request = getRequest()
    const auth = await getAuth(appEnv)
    const session = await auth.api.getSession({
      headers: request.headers,
    })
    if (!session) {
      return { ok: false, error: 'unauthorized' }
    }

    const existing = await getBetaRegistrationByUserId(
      appEnv.DB,
      session.user.id,
    )
    if (existing) {
      return { ok: false, error: 'already_registered' }
    }

    const id = crypto.randomUUID()
    await insertBetaRegistration(appEnv.DB, {
      id,
      userId: session.user.id,
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
