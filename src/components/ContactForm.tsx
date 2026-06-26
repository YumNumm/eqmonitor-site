import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import * as v from 'valibot'
import { ContactFormSchema } from '~/lib/inquirySchema'
import type { ContactSearch } from '~/lib/contactSearchSchema'

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

interface ContactFormProps {
  siteKey: string
  deviceInfo?: ContactSearch
}

export function ContactForm({ siteKey, deviceInfo }: ContactFormProps) {
  const widgetRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [token, setToken] = useState('')
  const [type, setType] = useState<'inquiry' | 'feedback' | 'bug'>('inquiry')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [includeDeviceInfo, setIncludeDeviceInfo] = useState(true)
  const [showDeviceInfoModal, setShowDeviceInfoModal] = useState(false)

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

    // 送信前にクライアント側でも valibot で検証する
    const validated = v.safeParse(ContactFormSchema, {
      type,
      name,
      email,
      subject,
      message,
    })
    if (!validated.success) {
      setErrorMsg(validated.issues[0].message)
      setStatus('error')
      return
    }

    setStatus('submitting')
    setErrorMsg('')
    try {
      // Build device_info JSON if device info is present and toggled on
      let device_info: string | undefined
      if (deviceInfo && includeDeviceInfo) {
        let parsedDeviceInfo: unknown
        if (deviceInfo.deviceInfo) {
          try {
            parsedDeviceInfo = JSON.parse(deviceInfo.deviceInfo)
          } catch {
            parsedDeviceInfo = deviceInfo.deviceInfo
          }
        }
        device_info = JSON.stringify({
          deviceId: deviceInfo.deviceId,
          appVersion: deviceInfo.appVersion,
          buildNumber: deviceInfo.buildNumber,
          os: deviceInfo.os,
          ...(parsedDeviceInfo != null ? { deviceInfo: parsedDeviceInfo } : {}),
        })
      }

      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          ...validated.output,
          ...(device_info != null ? { device_info } : {}),
        }),
      })
      if (res.ok) {
        setStatus('success')
        setName('')
        setEmail('')
        setSubject('')
        setMessage('')
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
    <>
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-xl mx-auto">
      {deviceInfo && (
        <div className="flex items-center justify-between rounded-lg border border-base-300 px-4 py-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={includeDeviceInfo}
              onChange={(e) => setIncludeDeviceInfo(e.target.checked)}
            />
            <div>
              <p className="text-sm font-medium">端末情報を送信に含める</p>
              <p className="text-xs text-base-content/60">
                問題の調査に役立ちます。{' '}
                <button
                  type="button"
                  className="link link-primary"
                  onClick={() => setShowDeviceInfoModal(true)}
                >
                  含まれる情報
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

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
        <span className="label-text mb-1">お名前</span>
        <input
          type="text"
          className="input input-bordered w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          placeholder="山田 太郎"
        />
      </label>

      <label className="form-control w-full">
        <span className="label-text mb-1">メールアドレス</span>
        <input
          type="email"
          className="input input-bordered w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
        />
      </label>

      <label className="form-control w-full">
        <span className="label-text mb-1">件名</span>
        <input
          type="text"
          className="input input-bordered w-full"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          maxLength={200}
          placeholder="お問い合わせの件名"
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

      <p className="text-sm text-base-content/70">
        送信することで
        <Link to="/privacy_policy" className="link link-primary">
          プライバシーポリシー
        </Link>
        に同意したものとみなします。
      </p>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={
          status === 'submitting' ||
          !name.trim() ||
          !email.trim() ||
          !subject.trim() ||
          !message.trim() ||
          !token
        }
      >
        {status === 'submitting'
          ? '送信中…'
          : 'プライバシーポリシーに同意して送信する'}
      </button>
    </form>

    {deviceInfo && (
      <dialog className={`modal ${showDeviceInfoModal ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-lg">
          <h3 className="text-lg font-bold mb-4">送信される端末情報</h3>
          <div className="flex flex-col gap-2 text-sm">
            {deviceInfo.deviceId && (
              <p>
                <span className="font-medium">Device ID:</span>{' '}
                {deviceInfo.deviceId}
              </p>
            )}
            {deviceInfo.appVersion && (
              <p>
                <span className="font-medium">App Version:</span>{' '}
                {deviceInfo.appVersion}
              </p>
            )}
            {deviceInfo.buildNumber && (
              <p>
                <span className="font-medium">Build Number:</span>{' '}
                {deviceInfo.buildNumber}
              </p>
            )}
            {deviceInfo.os && (
              <p>
                <span className="font-medium">OS:</span> {deviceInfo.os}
              </p>
            )}
            {deviceInfo.deviceInfo && (
              <div>
                <p className="font-medium mb-1">Device Info:</p>
                <pre className="bg-base-200 rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                  {(() => {
                    try {
                      return JSON.stringify(
                        JSON.parse(deviceInfo.deviceInfo),
                        null,
                        2,
                      )
                    } catch {
                      return deviceInfo.deviceInfo
                    }
                  })()}
                </pre>
              </div>
            )}
          </div>
          <div className="modal-action">
            <button
              type="button"
              className="btn"
              onClick={() => setShowDeviceInfoModal(false)}
            >
              閉じる
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button
            type="button"
            onClick={() => setShowDeviceInfoModal(false)}
          >
            close
          </button>
        </form>
      </dialog>
    )}
    </>
  )
}
