import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from 'cloudflare:workers'
import { app } from './app'
import { addBetaTester } from './asc-api'

export interface Env {
  DB: D1Database
  BETA_WORKFLOW: Workflow
  APP_STORE_CONNECT_KEY_ID: string
  APP_STORE_CONNECT_ISSUER_ID: string
  APP_STORE_CONNECT_PRIVATE_KEY: string
  BETA_GROUP_ID: string
}

interface BetaRegistrationParams {
  registrationId: string
  email: string
  firstName?: string
  lastName?: string
  betaGroupId: string
}

export class BetaRegistrationWorkflow extends WorkflowEntrypoint<
  Env,
  BetaRegistrationParams
> {
  async run(
    event: WorkflowEvent<BetaRegistrationParams>,
    step: WorkflowStep,
  ) {
    const { registrationId, email, firstName, lastName, betaGroupId } =
      event.payload

    const result = await step.do(
      'add-to-testflight',
      {
        retries: { limit: 3, delay: '5 seconds', backoff: 'linear' },
      },
      async () => {
        return await addBetaTester(this.env, {
          email,
          firstName,
          lastName,
          betaGroupId,
        })
      },
    )

    await step.do('update-registration-status', async () => {
      await this.env.DB.prepare(
        `UPDATE beta_registrations
         SET status = 'added', testflight_added_at = ?
         WHERE id = ?`,
      )
        .bind(new Date().toISOString(), registrationId)
        .run()
    })

    return { testerId: result.testerId }
  }
}

export type { AppType } from './app'
export default app
