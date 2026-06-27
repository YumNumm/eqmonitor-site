import { generateASCJwt } from './asc-jwt'

const ASC_BASE = 'https://api.appstoreconnect.apple.com/v1'

interface ASCEnv {
  APP_STORE_CONNECT_KEY_ID: string
  APP_STORE_CONNECT_ISSUER_ID: string
  APP_STORE_CONNECT_PRIVATE_KEY: string
}

export interface AddTesterResult {
  testerId: string
}

async function ascFetch(
  env: ASCEnv,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const jwt = await generateASCJwt(
    env.APP_STORE_CONNECT_KEY_ID,
    env.APP_STORE_CONNECT_ISSUER_ID,
    env.APP_STORE_CONNECT_PRIVATE_KEY,
  )

  return fetch(`${ASC_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}

export async function addBetaTester(
  env: ASCEnv,
  params: {
    email: string
    firstName?: string
    lastName?: string
    betaGroupId: string
  },
): Promise<AddTesterResult> {
  const body = {
    data: {
      type: 'betaTesters',
      attributes: {
        email: params.email,
        firstName: params.firstName ?? '',
        lastName: params.lastName ?? '',
      },
      relationships: {
        betaGroups: {
          data: [{ type: 'betaGroups', id: params.betaGroupId }],
        },
      },
    },
  }

  const res = await ascFetch(env, '/betaTesters', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`App Store Connect API error (${res.status}): ${text}`)
  }

  const json = (await res.json()) as { data: { id: string } }
  return { testerId: json.data.id }
}

/**
 * ベータグループに紐づく App の ID を取得する。
 * betaTesterInvitations の送信に App の ID が必須なため利用する。
 */
export async function getBetaGroupAppId(
  env: ASCEnv,
  betaGroupId: string,
): Promise<string> {
  const res = await ascFetch(
    env,
    `/betaGroups/${betaGroupId}/relationships/app`,
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(
      `App Store Connect API error (${res.status}) while resolving app for beta group: ${text}`,
    )
  }

  const json = (await res.json()) as { data: { id: string } | null }
  if (!json.data?.id) {
    throw new Error(
      `Beta group ${betaGroupId} is not associated with an app`,
    )
  }
  return json.data.id
}

/**
 * テスターへ TestFlight の招待メールを送信（再送）する。
 * betaGroups への追加だけでは招待メールが届かないケースがあるため明示的に送る。
 */
export async function sendBetaTesterInvitation(
  env: ASCEnv,
  params: {
    appId: string
    testerId: string
  },
): Promise<void> {
  const body = {
    data: {
      type: 'betaTesterInvitations',
      relationships: {
        app: {
          data: { type: 'apps', id: params.appId },
        },
        betaTester: {
          data: { type: 'betaTesters', id: params.testerId },
        },
      },
    },
  }

  const res = await ascFetch(env, '/betaTesterInvitations', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(
      `App Store Connect API error (${res.status}) while sending invitation: ${text}`,
    )
  }
}
