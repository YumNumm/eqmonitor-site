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
        secret: env.BETTER_AUTH_SECRET,
        baseURL: env.BETTER_AUTH_URL,
        trustedOrigins: ['https://appleid.apple.com', 'https://eqmonitor.app', 'https://eqmonitor-site.localhost'],
        socialProviders: {
          apple: {
            clientId: env.APPLE_CLIENT_ID,
            clientSecret,
          },
        },
        // Apple は response_mode=form_post なので、appleid.apple.com から
        // /api/auth/callback/apple へクロスサイト POST でコールバックされる。
        // state cookie が SameSite=Lax だとこの POST で送信されず OAuth state
        // 検証に失敗するため、state cookie のみ SameSite=None; Secure にする。
        advanced: {
          cookies: {
            state: {
              attributes: {
                sameSite: 'none',
                secure: true,
              },
            },
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
