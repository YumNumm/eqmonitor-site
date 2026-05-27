import type { Inquiry, InquiryType } from './db'

const TYPE_LABEL: Record<InquiryType, string> = {
  inquiry: '問い合わせ',
  feedback: 'フィードバック',
  bug: 'バグ報告',
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

  const title = `[${TYPE_LABEL[inquiry.type]}] ${inquiry.message.slice(0, 60)}`
  const body = [
    `## ${TYPE_LABEL[inquiry.type]}`,
    '',
    inquiry.message,
    '',
    '---',
    `- 受信日時: ${inquiry.created_at}`,
    inquiry.email ? `- 連絡先: ${inquiry.email}` : '- 連絡先: (なし)',
    inquiry.platform ? `- Platform: ${inquiry.platform}` : null,
    inquiry.app_version ? `- App version: ${inquiry.app_version}` : null,
    `- Inquiry ID: ${inquiry.id}`,
  ]
    .filter((line) => line !== null)
    .join('\n')

  const url = `https://api.github.com/repos/${owner}/${repo}/issues`
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'eqmonitor-site',
    'Content-Type': 'application/json',
  }

  const post = (payload: Record<string, unknown>) =>
    fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) })

  // ラベルが repo に存在しないと 422 になるため、その場合はラベルなしで再試行する
  let res = await post({ title, body, labels: [inquiry.type] })
  if (res.status === 422) {
    res = await post({ title, body })
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub Issue 作成に失敗: ${res.status} ${text}`)
  }

  const data = (await res.json()) as { number: number }
  return data.number
}
