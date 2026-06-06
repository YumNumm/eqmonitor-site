import * as v from 'valibot'

export const RegisterRequestSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email()),
  firstName: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100))),
  lastName: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100))),
  betaGroupId: v.pipe(v.string(), v.minLength(1)),
  registrationId: v.pipe(v.string(), v.minLength(1)),
})

export type RegisterRequest = v.InferOutput<typeof RegisterRequestSchema>

export const RegisterResponseSchema = v.object({
  ok: v.literal(true),
  workflowId: v.string(),
})

export type RegisterResponse = v.InferOutput<typeof RegisterResponseSchema>

export const ErrorResponseSchema = v.object({
  ok: v.literal(false),
  error: v.string(),
})

export type ErrorResponse = v.InferOutput<typeof ErrorResponseSchema>
