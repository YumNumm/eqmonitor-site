import { env } from 'cloudflare:workers'

/**
 * アプリが利用する binding / 環境変数の型。
 * 値の実体は wrangler.jsonc (vars / d1 / kv) と .dev.vars / `wrangler secret` (secrets)。
 */
export interface AppEnv {
  // bindings
  DB: D1Database
  RATE_LIMIT_KV: KVNamespace

  // public vars (wrangler.jsonc)
  TURNSTILE_SITE_KEY: string
  SLACK_CHANNEL_ID: string
  GITHUB_OWNER: string
  GITHUB_REPO: string

  // secrets (.dev.vars / wrangler secret)
  TURNSTILE_SECRET_KEY: string
  SLACK_BOT_TOKEN: string
  SLACK_SIGNING_SECRET: string
  GITHUB_TOKEN: string
  IP_HASH_SALT: string
}

export const appEnv = env as unknown as AppEnv
