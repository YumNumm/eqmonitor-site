export type InquiryType = 'inquiry' | 'feedback' | 'bug'
export type InquiryStatus = 'new' | 'issue_created' | 'dismissed'

export interface Inquiry {
  id: string
  created_at: string
  type: InquiryType
  email: string | null
  message: string
  app_version: string | null
  platform: string | null
  user_agent: string | null
  ip_hash: string | null
  status: InquiryStatus
  slack_message_ts: string | null
  github_issue_number: number | null
}

export type NewInquiry = Omit<
  Inquiry,
  'status' | 'slack_message_ts' | 'github_issue_number'
>

export async function insertInquiry(
  db: D1Database,
  inquiry: NewInquiry,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO inquiries
        (id, created_at, type, email, message, app_version, platform, user_agent, ip_hash, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
    )
    .bind(
      inquiry.id,
      inquiry.created_at,
      inquiry.type,
      inquiry.email,
      inquiry.message,
      inquiry.app_version,
      inquiry.platform,
      inquiry.user_agent,
      inquiry.ip_hash,
    )
    .run()
}

export async function getInquiry(
  db: D1Database,
  id: string,
): Promise<Inquiry | null> {
  return await db
    .prepare('SELECT * FROM inquiries WHERE id = ?')
    .bind(id)
    .first<Inquiry>()
}

export async function setSlackMessageTs(
  db: D1Database,
  id: string,
  ts: string,
): Promise<void> {
  await db
    .prepare('UPDATE inquiries SET slack_message_ts = ? WHERE id = ?')
    .bind(ts, id)
    .run()
}

export async function markIssueCreated(
  db: D1Database,
  id: string,
  issueNumber: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE inquiries SET status = 'issue_created', github_issue_number = ? WHERE id = ?`,
    )
    .bind(issueNumber, id)
    .run()
}

export async function markDismissed(
  db: D1Database,
  id: string,
): Promise<void> {
  await db
    .prepare(`UPDATE inquiries SET status = 'dismissed' WHERE id = ?`)
    .bind(id)
    .run()
}
