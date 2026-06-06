import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { RegisterRequestSchema } from './schemas'
import type { Env } from './index'

const app = new Hono<{ Bindings: Env }>()

const route = app.post(
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

export type AppType = typeof route
export { app }
