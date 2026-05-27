import type { Inquiry, InquiryType } from './db'

const SLACK_API = 'https://slack.com/api'

const TYPE_LABEL: Record<InquiryType, string> = {
  inquiry: '📨 問い合わせ',
  feedback: '💬 フィードバック',
  bug: '🐛 バグ報告',
}

function detailBlocks(inquiry: Inquiry) {
  const fields: string[] = [
    `*種別:*\n${TYPE_LABEL[inquiry.type]}`,
    `*受信日時:*\n${inquiry.created_at}`,
  ]
  if (inquiry.email) fields.push(`*メール:*\n${inquiry.email}`)
  if (inquiry.platform) fields.push(`*Platform:*\n${inquiry.platform}`)
  if (inquiry.app_version) fields.push(`*App ver:*\n${inquiry.app_version}`)

  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: TYPE_LABEL[inquiry.type] },
    },
    {
      type: 'section',
      fields: fields.map((text) => ({ type: 'mrkdwn', text })),
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*本文:*\n${inquiry.message}` },
    },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `ID: ${inquiry.id}` }] },
  ]
}

/**
 * 問い合わせ通知を Slack に投稿し、triage 用のボタンを付ける。
 * 返り値の ts は後で chat.update する際に使う。
 */
export async function postInquiryMessage(params: {
  botToken: string
  channel: string
  inquiry: Inquiry
}): Promise<string | null> {
  const { botToken, channel, inquiry } = params
  const res = await fetch(`${SLACK_API}/chat.postMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({
      channel,
      text: `新しい${TYPE_LABEL[inquiry.type]}が届きました`,
      blocks: [
        ...detailBlocks(inquiry),
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              action_id: 'create_issue',
              style: 'primary',
              text: { type: 'plain_text', text: 'GitHub Issue を作成' },
              value: inquiry.id,
            },
            {
              type: 'button',
              action_id: 'dismiss',
              style: 'danger',
              text: { type: 'plain_text', text: '却下' },
              value: inquiry.id,
            },
          ],
        },
      ],
    }),
  })
  const data = (await res.json()) as { ok: boolean; ts?: string }
  return data.ok ? (data.ts ?? null) : null
}

/**
 * 既存メッセージを更新し、ボタンを結果表示に差し替える。
 */
export async function updateInquiryMessage(params: {
  botToken: string
  channel: string
  ts: string
  inquiry: Inquiry
  resultText: string
}): Promise<void> {
  const { botToken, channel, ts, inquiry, resultText } = params
  await fetch(`${SLACK_API}/chat.update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({
      channel,
      ts,
      text: resultText,
      blocks: [
        ...detailBlocks(inquiry),
        { type: 'context', elements: [{ type: 'mrkdwn', text: resultText }] },
      ],
    }),
  })
}

/**
 * 既存メッセージのスレッドに返信する（ボタンは元メッセージに残したままにできる）。
 */
export async function postThreadReply(params: {
  botToken: string
  channel: string
  threadTs: string
  text: string
}): Promise<void> {
  await fetch(`${SLACK_API}/chat.postMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${params.botToken}`,
    },
    body: JSON.stringify({
      channel: params.channel,
      thread_ts: params.threadTs,
      text: params.text,
    }),
  })
}

/**
 * Slack interactivity callback の署名を検証する。
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
export async function verifySlackSignature(params: {
  signingSecret: string
  timestamp: string | null
  signature: string | null
  rawBody: string
}): Promise<boolean> {
  const { signingSecret, timestamp, signature, rawBody } = params
  if (!timestamp || !signature) return false

  // リプレイ防止: 5分以上古いリクエストは拒否
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > 60 * 5) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`v0:${timestamp}:${rawBody}`),
  )
  const expected = `v0=${[...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`

  return timingSafeEqual(expected, signature)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
