import { env } from 'cloudflare:workers'

/**
 * アプリが利用する binding / 環境変数の型。
 * 値の実体は wrangler.jsonc (vars / d1 / kv) と .dev.vars / `wrangler secret` (secrets)。
 */
export interface AppEnv {
  // bindings
  DB: D1Database

  // public vars (wrangler.jsonc)
  TURNSTILE_SITE_KEY: string
  GITHUB_OWNER: string
  GITHUB_REPO: string

  // secrets (.dev.vars / wrangler secret)
  TURNSTILE_SECRET_KEY: string
  GITHUB_TOKEN: string
}

export const appEnv = env as unknown as AppEnv
