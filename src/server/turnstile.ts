const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'

interface SiteverifyResponse {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
}

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
  const data = (await res.json()) as SiteverifyResponse
  return data.success === true
}
