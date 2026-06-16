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

export async function addBetaTester(
  env: ASCEnv,
  params: {
    email: string
    firstName?: string
    lastName?: string
    betaGroupId: string
  },
): Promise<AddTesterResult> {
  const jwt = await generateASCJwt(
    env.APP_STORE_CONNECT_KEY_ID,
    env.APP_STORE_CONNECT_ISSUER_ID,
    env.APP_STORE_CONNECT_PRIVATE_KEY,
  )

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

  const res = await fetch(`${ASC_BASE}/betaTesters`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`App Store Connect API error (${res.status}): ${text}`)
  }

  const json = (await res.json()) as { data: { id: string } }
  return { testerId: json.data.id }
}
