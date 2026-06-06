import { betterAuth } from 'better-auth'
import { withCloudflare } from 'better-auth-cloudflare'
import { dash, sentinel } from '@better-auth/infra'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { importPKCS8, SignJWT } from 'jose'
import type { AppEnv } from './env'

async function generateAppleClientSecret(env: AppEnv): Promise<string> {
  const pem = new TextDecoder().decode(
    Uint8Array.from(atob(env.APPLE_PRIVATE_KEY), (c) => c.charCodeAt(0)),
  )
  const key = await importPKCS8(pem, 'ES256')
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: env.APPLE_KEY_ID })
    .setIssuer(env.APPLE_TEAM_ID)
    .setSubject(env.APPLE_CLIENT_ID)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt(now)
    .setExpirationTime(now + 180 * 24 * 60 * 60)
    .sign(key)
}

let cachedAuth: any = null
let cachedSecretExpiry = 0

export async function getAuth(env: AppEnv): Promise<ReturnType<typeof betterAuth>> {
  const now = Date.now()
  if (cachedAuth && now < cachedSecretExpiry) return cachedAuth

  const clientSecret = await generateAppleClientSecret(env)

  cachedAuth = betterAuth(
    withCloudflare(
      {
        d1Native: env.DB,
        autoDetectIpAddress: false,
        geolocationTracking: false,
      },
      {
        trustedOrigins: ['https://appleid.apple.com', 'https://eqmonitor.app'],
        socialProviders: {
          apple: {
            clientId: env.APPLE_CLIENT_ID,
            clientSecret,
          },
        },
        plugins: [
          tanstackStartCookies(),
          dash({}),
          sentinel({
            security: {
              credentialStuffing: {
                enabled: true,
              },
            },
          }),
        ],
        logger: {
          level: 'info',
          disableColors: true,
        },
      },
    ),
  )

  cachedSecretExpiry = now + 90 * 24 * 60 * 60 * 1000

  return cachedAuth
}
