export type InquiryType = 'inquiry' | 'feedback' | 'bug'
export type InquiryStatus = 'new' | 'issue_created'

export interface Inquiry {
  id: string
  created_at: string
  type: InquiryType
  name: string
  email: string
  subject: string
  message: string
  app_version: string | null
  platform: string | null
  user_agent: string | null
  device_info: string | null
  status: InquiryStatus
  github_issue_number: number | null
}

export type NewInquiry = Omit<Inquiry, 'status' | 'github_issue_number'>

export async function insertInquiry(
  db: D1Database,
  inquiry: NewInquiry,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO inquiries
        (id, created_at, type, name, email, subject, message, app_version, platform, user_agent, device_info, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
    )
    .bind(
      inquiry.id,
      inquiry.created_at,
      inquiry.type,
      inquiry.name,
      inquiry.email,
      inquiry.subject,
      inquiry.message,
      inquiry.app_version,
      inquiry.platform,
      inquiry.user_agent,
      inquiry.device_info,
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
