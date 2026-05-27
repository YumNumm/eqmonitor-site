import * as v from 'valibot'

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'

const SiteverifyResponseSchema = v.object({
  success: v.boolean(),
  'error-codes': v.optional(v.array(v.string())),
  challenge_ts: v.optional(v.string()),
  hostname: v.optional(v.string()),
})

/**
 * Turnstile token をサーバー側で検証する。
 * @see https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verifyTurnstile(params: {
  secretKey: string
  token: string
  remoteip?: string
}): Promise<boolean> {
  const body = new FormData()
  body.append('secret', params.secretKey)
  body.append('response', params.token)
  if (params.remoteip) {
    body.append('remoteip', params.remoteip)
  }

  const res = await fetch(SITEVERIFY_URL, { method: 'POST', body })
  if (!res.ok) {
    return false
  }
  // 想定外のレスポンス形状は検証失敗として扱う
  const result = v.safeParse(SiteverifyResponseSchema, await res.json())
  return result.success && result.output.success === true
}
