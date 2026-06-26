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

  // Beta config
  BETA_GROUP_ID: string
}

export const appEnv = env as unknown as AppEnv
