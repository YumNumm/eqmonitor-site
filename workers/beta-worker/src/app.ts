import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { RegisterRequestSchema } from './schemas'

const app = new Hono<{ Bindings: Cloudflare.Env }>()

const route = app
  .post(
    '/register',
    vValidator('json', RegisterRequestSchema),
    async (c) => {
      const data = c.req.valid('json')

      const instance = await c.env.BETA_WORKFLOW.create({
        params: {
          registrationId: data.registrationId,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          betaGroupId: data.betaGroupId,
        },
      })

      return c.json({ ok: true as const, workflowId: instance.id }, 201)
    },
  )
  .get('/status/:workflowId', async (c) => {
    const workflowId = c.req.param('workflowId')

    try {
      const instance = await c.env.BETA_WORKFLOW.get(workflowId)
      const status = await instance.status()

      return c.json({
        status: status.status,
        output: status.output,
        error: status.error,
      })
    } catch {
      return c.json({ status: 'errored' as const, error: 'Workflow not found' }, 404)
    }
  })

export type AppType = typeof route
export { app }
