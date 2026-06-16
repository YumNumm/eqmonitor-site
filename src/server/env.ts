import { env } from 'cloudflare:workers'

export interface AppEnv {
  // bindings
  DB: D1Database

  // service bindings
  BETA_WORKER: Fetcher

  // public vars (wrangler.jsonc)
  TURNSTILE_SITE_KEY: string
  GITHUB_OWNER: string
  GITHUB_REPO: string

  // secrets (.dev.vars / wrangler secret)
  TURNSTILE_SECRET_KEY: string
  GITHUB_TOKEN: string

  // BetterAuth Apple OAuth secrets
  APPLE_CLIENT_ID: string
  APPLE_TEAM_ID: string
  APPLE_KEY_ID: string
  APPLE_PRIVATE_KEY: string

  // BetterAuth core
  BETTER_AUTH_SECRET: string
  // 本番のみ設定。未設定（ローカル）ではリクエストから自動検出される。
  BETTER_AUTH_URL?: string

  // Beta config
  BETA_GROUP_ID: string
}

export const appEnv = env as unknown as AppEnv
