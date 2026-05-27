import { createFileRoute } from '@tanstack/react-router'
import * as v from 'valibot'
import { appEnv } from '~/server/env'
import { verifyTurnstile } from '~/server/turnstile'
import { getInquiry, insertInquiry, markIssueCreated } from '~/server/db'
import { createIssue } from '~/server/github'
import { ContactFormSchema } from '~/lib/inquirySchema'

const InquirySchema = v.object({
  ...ContactFormSchema.entries,
  token: v.pipe(v.string(), v.minLength(1, 'Turnstile token が必要です')),
  app_version: v.optional(v.pipe(v.string(), v.maxLength(50))),
  platform: v.optional(v.pipe(v.string(), v.maxLength(50))),
})

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const Route = createFileRoute('/api/inquiry')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed: v.InferOutput<typeof InquirySchema>
        try {
          const raw = await request.json()
          parsed = v.parse(InquirySchema, raw)
        } catch {
          return json({ error: 'invalid_request' }, 400)
        }

        const ip = request.headers.get('cf-connecting-ip') ?? 'unknown'

        // 1. Turnstile 検証
        const ok = await verifyTurnstile({
          secretKey: appEnv.TURNSTILE_SECRET_KEY,
          token: parsed.token,
          remoteip: ip !== 'unknown' ? ip : undefined,
        })
        if (!ok) {
          return json({ error: 'turnstile_failed' }, 400)
        }

        // 2. D1 へ先に確定保存
        const id = crypto.randomUUID()
        await insertInquiry(appEnv.DB, {
          id,
          created_at: new Date().toISOString(),
          type: parsed.type,
          name: parsed.name,
          email: parsed.email,
          subject: parsed.subject,
          message: parsed.message,
          app_version: parsed.app_version ?? null,
          platform: parsed.platform ?? null,
          user_agent: request.headers.get('user-agent'),
        })

        // 3. GitHub Issue 作成 (失敗しても問い合わせは保存済みなので 200 を返す)
        try {
          const inquiry = await getInquiry(appEnv.DB, id)
          if (inquiry && appEnv.GITHUB_TOKEN) {
            const issueNumber = await createIssue({
              token: appEnv.GITHUB_TOKEN,
              owner: appEnv.GITHUB_OWNER,
              repo: appEnv.GITHUB_REPO,
              inquiry,
            })
            await markIssueCreated(appEnv.DB, id, issueNumber)
          }
        } catch (e) {
          console.error('GitHub Issue 作成に失敗', e)
        }

        return json({ ok: true, id })
      },
    },
  },
})
