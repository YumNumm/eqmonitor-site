
import { WorkflowEntrypoint, WorkflowStep, type WorkflowEvent } from 'cloudflare:workers';
import { app } from './app'
import {
  addBetaTester,
  getBetaGroupAppId,
  sendBetaTesterInvitation,
} from './asc-api'
import { betaRegisteredHtml } from './emails/beta-registered'


function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface BetaRegistrationParams {
  registrationId: string
  email: string
  firstName?: string
  lastName?: string
  betaGroupId: string
}

export class BetaRegistrationWorkflow extends WorkflowEntrypoint<
  Cloudflare.Env,
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

    await step.do(
      'send-testflight-invitation',
      {
        retries: { limit: 3, delay: '5 seconds', backoff: 'linear' },
      },
      async () => {
        const appId = await getBetaGroupAppId(this.env, betaGroupId)
        await sendBetaTesterInvitation(this.env, {
          appId,
          testerId: result.testerId,
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

    await step.do('send-email', async () => {
      const displayName = [lastName, firstName].filter(Boolean).join(' ').trim()
      const greeting = displayName ? `${escapeHtml(displayName)} さん` : ''
      const html = betaRegisteredHtml.replace('{{GREETING}}', greeting)

      await this.env.EMAIL.send({
        to: email,
        from: 'noreply@mail.eqmonitor.app',
        replyTo: 'support@eqmonitor.app',
        subject: 'EQMonitor v3 ベータプログラムへの登録が完了しました',
        cc: 'support@eqmonitor.app',
        html,
      })
    })

    return { testerId: result.testerId }
  }
}

export type { AppType } from './app'
export default app
