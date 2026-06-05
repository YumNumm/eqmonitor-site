import { importPKCS8, SignJWT } from 'jose'

export async function generateASCJwt(
  keyId: string,
  issuerId: string,
  privateKey: string,
): Promise<string> {
  const key = await importPKCS8(privateKey, 'ES256')
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
    .setIssuer(issuerId)
    .setIssuedAt(now)
    .setExpirationTime(now + 20 * 60)
    .setAudience('appstoreconnect-v1')
    .sign(key)
}
