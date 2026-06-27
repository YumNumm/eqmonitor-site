import { importPKCS8, SignJWT } from 'jose'

export async function generateASCJwt(
  keyId: string,
  issuerId: string,
  privateKey: string,
): Promise<string> {
  // シークレットに格納された .p8 鍵は、改行がリテラルの `\n` に
  // エスケープされていることがある。その場合 importPKCS8 が PEM 本文の
  // base64 デコードに失敗する（"Found a character that cannot be part of
  // a valid base64 string."）ため、実際の改行へ正規化してから渡す。
  const normalizedKey = privateKey.replace(/\\n/g, '\n')
  const key = await importPKCS8(normalizedKey, 'ES256')
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
    .setIssuer(issuerId)
    .setIssuedAt(now)
    .setExpirationTime(now + 20 * 60)
    .setAudience('appstoreconnect-v1')
    .sign(key)
}
