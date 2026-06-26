export interface ContactSearch {
  deviceId?: string
  appVersion?: string
  buildNumber?: string
  os?: string
  deviceInfo?: string
}

// TanStack Router auto-coerces numeric/JSON values; normalize back to string
function toString(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  return JSON.stringify(val)
}

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
