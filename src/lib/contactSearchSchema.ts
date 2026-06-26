import * as v from 'valibot'

/**
 * /contact ページのクエリパラメータスキーマ。
 * アプリの WebView から端末情報を受け取る際に使用する。
 */
export const ContactSearchSchema = v.object({
  deviceId: v.optional(v.string()),
  appVersion: v.optional(v.string()),
  buildNumber: v.optional(v.string()),
  os: v.optional(v.string()),
  deviceInfo: v.optional(v.string()),
})

export type ContactSearch = v.InferOutput<typeof ContactSearchSchema>
