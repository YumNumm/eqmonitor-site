export type RegisterResult =
  | { ok: true; id: string; workflowId: string }
  | { ok: false; error: 'turnstile_failed' | 'already_registered' | 'workflow_failed' }

export interface BetaStatus {
  status: string
  error?: string | { message?: string } | null
}
