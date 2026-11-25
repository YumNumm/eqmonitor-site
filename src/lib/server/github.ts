import * as v from 'valibot'
import type { Inquiry, InquiryType } from './db'

const CreateIssueResponseSchema = v.object({
  number: v.number(),
})

const TYPE_LABEL: Record<InquiryType, string> = {
  inquiry: '問い合わせ',
  feedback: 'フィードバック',
  bug: 'バグ報告',
}

const LABEL_DEFINITION: Record<
  InquiryType,
  { name: string; color: string; description: string }
> = {
  inquiry: { name: 'inquiry', color: '0075ca', description: '問い合わせ' },
  feedback: { name: 'feedback', color: 'a2eeef', description: 'フィードバック' },
  bug: { name: 'bug', color: 'd73a4a', description: 'バグ報告' },
}

function githubHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'eqmonitor-site',
    'Content-Type': 'application/json',
  }
}

/**
 * ラベルが repo に存在することを保証する 
 * 既に存在する場合は 422 (already_exists) が返るので無視する。
 * @see https://docs.github.com/en/rest/issues/labels#create-a-label
 */
async function ensureLabel(params: {
  token: string
  owner: string
  repo: string
  label: { name: string; color: string; description: string }
}): Promise<void> {
  const { token, owner, repo, label } = params
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/labels`,
    {
      method: 'POST',
      headers: githubHeaders(token),
      body: JSON.stringify(label),
    },
  )
  if (!res.ok && res.status !== 422) {
    const text = await res.text()
    throw new Error(`GitHub ラベル作成に失敗: ${res.status} ${text}`)
  }
}

/**
 * 問い合わせ内容から GitHub Issue を作成し、Issue 番号を返す。
 * @see https://docs.github.com/en/rest/issues/issues#create-an-issue
 */
export async function createIssue(params: {
  token: string
  owner: string
  repo: string
  inquiry: Inquiry
}): Promise<number> {
  const { token, owner, repo, inquiry } = params

  const title = `[${TYPE_LABEL[inquiry.type]}] ${inquiry.subject}`
  let body = [
    `## ${inquiry.subject}`,
    '',
    inquiry.message,
    '',
    '---',
    `- 受信日時: ${inquiry.created_at}`,
    `- お名前: ${inquiry.name}`,
    `- 連絡先: ${inquiry.email}`,
    inquiry.platform ? `- Platform: ${inquiry.platform}` : null,
    inquiry.app_version ? `- App version: ${inquiry.app_version}` : null,
    `- Inquiry ID: ${inquiry.id}`,
  ]
    .filter((line) => line !== null)
    .join('\n')

  // Append device info as a collapsible section if present
  if (inquiry.device_info) {
    let deviceSection: string
    try {
      const info = JSON.parse(inquiry.device_info) as Record<string, unknown>
      const lines = [
        '',
        '<details>',
        '<summary>Device Info</summary>',
        '',
        info.deviceId != null ? `- Device ID: ${info.deviceId}` : null,
        info.appVersion != null ? `- App Version: ${info.appVersion}` : null,
        info.buildNumber != null ? `- Build Number: ${info.buildNumber}` : null,
        info.os != null ? `- OS: ${info.os}` : null,
        '',
        '```json',
        JSON.stringify(info, null, 2),
        '```',
        '',
        '</details>',
      ]
        .filter((line) => line !== null)
        .join('\n')
      deviceSection = lines
    } catch {
      deviceSection = [
        '',
        '<details>',
        '<summary>Device Info</summary>',
        '',
        '```',
        inquiry.device_info,
        '```',
        '',
        '</details>',
      ].join('\n')
    }
    body += deviceSection
  }

  // ラベルが無いと issue 作成時に 422 になるため、先に存在を保証してから付与する
  const label = LABEL_DEFINITION[inquiry.type]
  await ensureLabel({ token, owner, repo, label })

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
      method: 'POST',
      headers: githubHeaders(token),
      body: JSON.stringify({ title, body, labels: [label.name] }),
    },
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub Issue 作成に失敗: ${res.status} ${text}`)
  }

  const data = v.parse(CreateIssueResponseSchema, await res.json())
  return data.number
}
