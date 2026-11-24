import { env } from 'cloudflare:workers'

export interface AppEnv {
  // bindings
  DB: D1Database
  PROJECTS_KV: KVNamespace

  // service bindings
  BETA_WORKER: Fetcher
  OG_WORKER: Fetcher

  // public vars (wrangler.jsonc)
  TURNSTILE_SITE_KEY: string
  GITHUB_OWNER: string
  GITHUB_REPO: string

  // secrets (.dev.vars / wrangler secret)
  TURNSTILE_SECRET_KEY: string
  GITHUB_TOKEN: string
  GITHUB_APP_ID: string
  GITHUB_APP_PRIVATE_KEY: string
  GITHUB_APP_INSTALLATION_ID: string

  // Beta config
  BETA_GROUP_ID: string
}

export const appEnv = env as unknown as AppEnv
