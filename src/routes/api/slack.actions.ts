import { createFileRoute } from '@tanstack/react-router'
import { appEnv } from '~/server/env'
import {
  getInquiry,
  markDismissed,
  markIssueCreated,
} from '~/server/db'
import {
  postThreadReply,
  updateInquiryMessage,
  verifySlackSignature,
} from '~/server/slack'
import { createIssue } from '~/server/github'

interface SlackBlockActionsPayload {
  type: string
  actions: Array<{ action_id: string; value: string }>
  channel: { id: string }
  message: { ts: string }
  user: { id: string; username?: string }
}

export const Route = createFileRoute('/api/slack/actions')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 署名検証のため raw body を先に取得する
        const rawBody = await request.text()

        const valid = await verifySlackSignature({
          signingSecret: appEnv.SLACK_SIGNING_SECRET,
          timestamp: request.headers.get('x-slack-request-timestamp'),
          signature: request.headers.get('x-slack-signature'),
          rawBody,
        })
        if (!valid) {
          return new Response('invalid signature', { status: 401 })
        }

        const params = new URLSearchParams(rawBody)
        const payloadRaw = params.get('payload')
        if (!payloadRaw) {
          return new Response('bad request', { status: 400 })
        }
        const payload = JSON.parse(payloadRaw) as SlackBlockActionsPayload

        const action = payload.actions?.[0]
        const inquiryId = action?.value
        const channel = payload.channel.id
        const ts = payload.message.ts

        if (!action || !inquiryId) {
          return new Response('', { status: 200 })
        }

        const inquiry = await getInquiry(appEnv.DB, inquiryId)
        if (!inquiry) {
          return new Response('', { status: 200 })
        }

        const operator = payload.user.username ?? payload.user.id

        if (action.action_id === 'create_issue') {
          // 既に作成済みなら二重作成しない
          if (inquiry.status === 'issue_created') {
            return new Response('', { status: 200 })
          }
          try {
            const issueNumber = await createIssue({
              token: appEnv.GITHUB_TOKEN,
              owner: appEnv.GITHUB_OWNER,
              repo: appEnv.GITHUB_REPO,
              inquiry,
            })
            await markIssueCreated(appEnv.DB, inquiryId, issueNumber)
            const issueUrl = `https://github.com/${appEnv.GITHUB_OWNER}/${appEnv.GITHUB_REPO}/issues/${issueNumber}`
            await updateInquiryMessage({
              botToken: appEnv.SLACK_BOT_TOKEN,
              channel,
              ts,
              inquiry,
              resultText: `✅ <${issueUrl}|Issue #${issueNumber}> を作成しました (by ${operator})`,
            })
          } catch (e) {
            // 失敗をスレッド返信で可視化する。元メッセージのボタンは残るので再試行できる。
            console.error('GitHub Issue 作成に失敗', e)
            await postThreadReply({
              botToken: appEnv.SLACK_BOT_TOKEN,
              channel,
              threadTs: ts,
              text: `❌ Issue 作成に失敗しました。もう一度ボタンを押して再試行してください (by ${operator})`,
            })
          }
        } else if (action.action_id === 'dismiss') {
          await markDismissed(appEnv.DB, inquiryId)
          await updateInquiryMessage({
            botToken: appEnv.SLACK_BOT_TOKEN,
            channel,
            ts,
            inquiry,
            resultText: `🗑 却下しました (by ${operator})`,
          })
        }

        return new Response('', { status: 200 })
      },
    },
  },
})
