/**
 * KV ベースの簡易レート制限。
 * `windowSec` の固定ウィンドウ内で `limit` 件まで許可する。
 * 返り値が false の場合は上限超過。
 */
export async function checkRateLimit(params: {
  kv: KVNamespace
  identifier: string
  limit: number
  windowSec: number
}): Promise<boolean> {
  const { kv, identifier, limit, windowSec } = params
  const windowIndex = Math.floor(Date.now() / 1000 / windowSec)
  const key = `ratelimit:${identifier}:${windowIndex}`

  const current = Number((await kv.get(key)) ?? '0')
  if (current >= limit) {
    return false
  }

  // TTL はウィンドウ長 + バッファ。固定ウィンドウなので厳密な原子性は不要。
  await kv.put(key, String(current + 1), { expirationTtl: windowSec + 60 })
  return true
}

/**
 * IP アドレスをソルト付きで SHA-256 ハッシュ化する（生 IP は保存しない）。
 */
export async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
