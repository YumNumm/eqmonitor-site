export interface DeviceInfoParams {
  deviceId?: string
  appVersion?: string
  buildNumber?: string
  os?: string
  deviceInfo?: string
}

export function readDeviceInfoParams(params: Pick<URLSearchParams, 'get'>): DeviceInfoParams | undefined {
  const info: DeviceInfoParams = {
    deviceId: params.get('deviceId') ?? undefined,
    appVersion: params.get('appVersion') ?? undefined,
    buildNumber: params.get('buildNumber') ?? undefined,
    os: params.get('os') ?? undefined,
    deviceInfo: params.get('deviceInfo') ?? undefined,
  }
  return Object.values(info).some(Boolean) ? info : undefined
}

export function formatDeviceInfoJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

export function serializeDeviceInfo(info: DeviceInfoParams): string {
  let parsedDeviceInfo: unknown
  if (info.deviceInfo) {
    try {
      parsedDeviceInfo = JSON.parse(info.deviceInfo)
    } catch {
      parsedDeviceInfo = info.deviceInfo
    }
  }
  return JSON.stringify({
    deviceId: info.deviceId,
    appVersion: info.appVersion,
    buildNumber: info.buildNumber,
    os: info.os,
    ...(parsedDeviceInfo != null ? { deviceInfo: parsedDeviceInfo } : {}),
  })
}
