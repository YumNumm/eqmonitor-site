import type { RequestHandler } from './$types';

import { json } from '@sveltejs/kit';
import * as v from 'valibot';

import { ContactFormSchema } from '#lib/inquirySchema.ts';
import { getInquiry, insertInquiry, markIssueCreated } from '#lib/server/db.ts';
import { appEnv } from '#lib/server/env.ts';
import { createIssue } from '#lib/server/github.ts';
import { verifyTurnstile } from '#lib/server/turnstile.ts';

const InquirySchema = v.object({
  ...ContactFormSchema.entries,
  token: v.pipe(v.string(), v.minLength(1, 'Turnstile token が必要です')),
  app_version: v.optional(v.pipe(v.string(), v.maxLength(50))),
  platform: v.optional(v.pipe(v.string(), v.maxLength(50))),
  device_info: v.optional(v.pipe(v.string(), v.maxLength(10000))),
});

export const POST: RequestHandler = async ({ request }) => {
  let parsed: v.InferOutput<typeof InquirySchema>;
  try {
    parsed = v.parse(InquirySchema, await request.json());
  } catch {
    return json({ error: 'invalid_request' }, { status: 400 });
  }

  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';

  const ok = await verifyTurnstile({
    secretKey: appEnv.TURNSTILE_SECRET_KEY,
    token: parsed.token,
    remoteip: ip !== 'unknown' ? ip : undefined,
  });
  if (!ok) {
    return json({ error: 'turnstile_failed' }, { status: 400 });
  }

  // GitHub Issue 作成より先に保存し、通知が失敗しても問い合わせを失わないようにする
  const id = crypto.randomUUID();
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
    device_info: parsed.device_info ?? null,
  });

  try {
    const inquiry = await getInquiry(appEnv.DB, id);
    if (inquiry && appEnv.GITHUB_TOKEN) {
      const issueNumber = await createIssue({
        token: appEnv.GITHUB_TOKEN,
        owner: appEnv.GITHUB_OWNER,
        repo: appEnv.GITHUB_REPO,
        inquiry,
      });
      await markIssueCreated(appEnv.DB, id, issueNumber);
    }
  } catch (error) {
    console.error('GitHub Issue 作成に失敗', error);
  }

  return json({ ok: true, id });
};
