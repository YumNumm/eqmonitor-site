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
<<<<<<< Updated upstream
=======

  // BetterAuth Apple OAuth secrets
  APPLE_CLIENT_ID: string
  APPLE_TEAM_ID: string
  APPLE_KEY_ID: string
  APPLE_PRIVATE_KEY: string

  // BetterAuth core
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL?: string

  // Beta config
  BETA_GROUP_ID: string
>>>>>>> Stashed changes
}

export const appEnv = env as unknown as AppEnv
