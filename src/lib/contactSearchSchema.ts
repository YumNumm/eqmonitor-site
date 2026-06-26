/**
 * /contact ページのクエリパラメータ型。
 * アプリの WebView から端末情報を受け取る際に使用する。
 *
 * TanStack Router は numeric-looking な値を number に変換し、
 * JSON-encoded な値を自動パースするため、validateSearch 内で
 * 手動で string に正規化する。
 */
export interface ContactSearch {
  deviceId?: string
  appVersion?: string
  buildNumber?: string
  os?: string
  deviceInfo?: string
}

/** Coerce an unknown value to a string (handles string, number, object). */
function toString(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  return JSON.stringify(val)
}

/**
 * TanStack Router の validateSearch で使用する関数。
 * 任意の search オブジェクトを ContactSearch に正規化する。
 */
export function validateContactSearch(
  search: Record<string, unknown>,
): ContactSearch {
  return {
    deviceId: toString(search.deviceId),
    appVersion: toString(search.appVersion),
    buildNumber: toString(search.buildNumber),
    os: toString(search.os),
    deviceInfo: toString(search.deviceInfo),
  }
}
