import { useEffect, useRef, useState } from 'react'
import * as v from 'valibot'

const InquiryErrorSchema = v.object({
  error: v.optional(v.string()),
})

// Turnstile の最小型定義 (explicit rendering)
declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          theme?: 'light' | 'dark' | 'auto'
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        },
      ) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
  }
}

const TURNSTILE_SCRIPT =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function ContactForm({ siteKey }: { siteKey: string }) {
  const widgetRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [token, setToken] = useState('')
  const [type, setType] = useState<'inquiry' | 'feedback' | 'bug'>('inquiry')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Turnstile ウィジェットを explicit rendering で描画する
  useEffect(() => {
    let cancelled = false

    function renderWidget() {
      if (cancelled || !widgetRef.current || !window.turnstile) return
      if (widgetIdRef.current) return
      widgetIdRef.current = window.turnstile.render(widgetRef.current, {
        sitekey: siteKey,
        theme: 'auto',
        callback: (t) => setToken(t),
        'expired-callback': () => setToken(''),
        'error-callback': () => setToken(''),
      })
    }

    if (window.turnstile) {
      renderWidget()
    } else if (!document.querySelector(`script[src="${TURNSTILE_SCRIPT}"]`)) {
      const script = document.createElement('script')
      script.src = TURNSTILE_SCRIPT
      script.async = true
      script.defer = true
      script.onload = renderWidget
      document.head.appendChild(script)
    } else {
      const timer = setInterval(() => {
        if (window.turnstile) {
          clearInterval(timer)
          renderWidget()
        }
      }, 200)
      return () => clearInterval(timer)
    }

    return () => {
      cancelled = true
    }
  }, [siteKey])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      setErrorMsg('認証を完了してください')
      setStatus('error')
      return
    }
    setStatus('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, type, message, email }),
      })
      if (res.ok) {
        setStatus('success')
        setMessage('')
        setEmail('')
      } else {
        const raw = await res.json().catch(() => ({}))
        const parsed = v.safeParse(InquiryErrorSchema, raw)
        const error = parsed.success ? parsed.output.error : undefined
        setErrorMsg(
          error === 'turnstile_failed'
            ? '認証に失敗しました。もう一度お試しください。'
            : '送信に失敗しました。時間をおいて再度お試しください。',
        )
        setStatus('error')
      }
    } catch {
      setErrorMsg('通信エラーが発生しました。')
      setStatus('error')
    } finally {
      setToken('')
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current)
      }
    }
  }

  if (status === 'success') {
    return (
      <div className="alert alert-success max-w-xl mx-auto">
        <span>
          送信しました。お問い合わせありがとうございます。
          内容を確認のうえ対応いたします。
        </span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-xl mx-auto">
      <label className="form-control w-full">
        <span className="label-text mb-1">種別</span>
        <select
          className="select select-bordered w-full"
          value={type}
          onChange={(e) =>
            setType(e.target.value as 'inquiry' | 'feedback' | 'bug')
          }
        >
          <option value="inquiry">問い合わせ</option>
          <option value="feedback">フィードバック</option>
          <option value="bug">バグ報告</option>
        </select>
      </label>

      <label className="form-control w-full">
        <span className="label-text mb-1">
          メールアドレス（任意・返信が必要な場合）
        </span>
        <input
          type="email"
          className="input input-bordered w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>

      <label className="form-control w-full">
        <span className="label-text mb-1">本文</span>
        <textarea
          className="textarea textarea-bordered w-full min-h-40"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          maxLength={5000}
          placeholder="ご意見・ご要望・不具合の内容をご記入ください"
        />
      </label>

      <div ref={widgetRef} />

      {status === 'error' && (
        <div className="alert alert-error">
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={status === 'submitting' || !message.trim() || !token}
      >
        {status === 'submitting' ? '送信中…' : '送信する'}
      </button>
    </form>
  )
}
