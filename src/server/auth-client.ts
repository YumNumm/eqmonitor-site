import { cloudflareClient } from 'better-auth-cloudflare/client'
import { sentinelClient } from '@better-auth/infra/client'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  plugins: [
    cloudflareClient(),
    sentinelClient({
      autoSolveChallenge: true,
    }),
  ],
})
