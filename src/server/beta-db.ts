export interface BetaRegistration {
  id: string
  email: string
  platform: string
  status: string
  workflow_id: string | null
  created_at: string
  testflight_added_at: string | null
  error_message: string | null
}

export async function insertBetaRegistration(
  db: D1Database,
  registration: {
    id: string
    email: string
    platform: string
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO beta_registrations (id, email, platform, status, created_at)
       VALUES (?, ?, ?, 'pending', ?)`,
    )
    .bind(
      registration.id,
      registration.email,
      registration.platform,
      new Date().toISOString(),
    )
    .run()
}

export async function updateWorkflowId(
  db: D1Database,
  id: string,
  workflowId: string,
): Promise<void> {
  await db
    .prepare('UPDATE beta_registrations SET workflow_id = ? WHERE id = ?')
    .bind(workflowId, id)
    .run()
}

export async function getBetaRegistrationByEmail(
  db: D1Database,
  email: string,
): Promise<BetaRegistration | null> {
  return await db
    .prepare('SELECT * FROM beta_registrations WHERE email = ?')
    .bind(email)
    .first<BetaRegistration>()
}
