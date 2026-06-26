import { useEffect, useRef, useState } from 'react'
import * as v from 'valibot'
import { BetaRegistrationFormSchema } from '~/lib/betaSchema'
import { registerBeta, getBetaStatus } from '~/server/beta-register'
import { BetaTermsModal } from './BetaTermsModal'

const TURNSTILE_SCRIPT =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

const WORKFLOW_STEPS = [
  { key: 'add-to-testflight', label: 'TestFlightに追加' },
  { key: 'send-testflight-invitation', label: 'TestFlight招待メール送信' },
  { key: 'update-registration-status', label: '登録ステータス更新' },
  { key: 'send-email', label: '登録完了メール送信' },
] as const

type FormStatus = 'idle' | 'submitting' | 'polling' | 'success' | 'error'

export function BetaForm({ siteKey }: { siteKey: string }) {
  const widgetRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [workflowStatus, setWorkflowStatus] = useState<string>('running')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCountRef = useRef(0)

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

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  function startPolling(workflowId: string) {
    setStatus('polling')
    setWorkflowStatus('running')
    pollCountRef.current = 0

    pollingRef.current = setInterval(async () => {
      pollCountRef.current++

      if (pollCountRef.current > 30) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setErrorMsg('タイムアウトしました。しばらく経ってからメールをご確認ください。')
        setStatus('error')
        return
      }

      try {
        const result = await getBetaStatus({ data: { workflowId } })
        setWorkflowStatus(result.status)

        if (result.status === 'complete') {
          if (pollingRef.current) clearInterval(pollingRef.current)
          setStatus('success')
        } else if (result.status === 'errored') {
          if (pollingRef.current) clearInterval(pollingRef.current)
          const errorDetail = result.error
          setErrorMsg(
            typeof errorDetail === 'string'
              ? errorDetail
              : errorDetail?.message ?? '登録処理中にエラーが発生しました。',
          )
          setStatus('error')
        }
      } catch {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setErrorMsg('ステータスの取得に失敗しました。')
        setStatus('error')
      }
    }, 2000)
  }

  function handleNext() {
    const validated = v.safeParse(BetaRegistrationFormSchema, {
      platform: 'ios',
      email,
      turnstileToken: token,
    })
    if (!validated.success) {
      setErrorMsg(validated.issues[0].message)
      setStatus('error')
      return
    }
    setErrorMsg('')
    setShowModal(true)
  }

  async function handleConfirm() {
    setStatus('submitting')
    setErrorMsg('')
    setShowModal(false)
    try {
      const result = await registerBeta({
        data: { platform: 'ios', email, turnstileToken: token },
      })
      if (result.ok) {
        startPolling(result.workflowId)
      } else {
        if (result.error === 'already_registered') {
          setErrorMsg('既にベータプログラムに登録されています。')
        } else if (result.error === 'turnstile_failed') {
          setErrorMsg('認証に失敗しました。もう一度お試しください。')
        } else {
          setErrorMsg('登録に失敗しました。時間をおいて再度お試しください。')
        }
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

  if (status === 'polling') {
    return (
      <div className="max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-6">ベータプログラム登録中...</h2>
        <ul className="steps steps-vertical w-full">
          {WORKFLOW_STEPS.map((step) => {
            const isComplete = workflowStatus === 'complete'
            return (
              <li key={step.key} className={`step ${isComplete ? 'step-primary' : ''}`}>
                <div className="flex items-center gap-2">
                  {isComplete ? '✅' : '⏳'}
                  <span>{step.label}</span>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="flex justify-center mt-6">
          <span className="loading loading-spinner loading-md" />
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="alert alert-success max-w-md mx-auto">
        <span>
          ベータプログラムへの登録が完了しました。TestFlight
          の招待メールをご確認ください。
        </span>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4 max-w-md mx-auto">
        <label className="form-control w-full">
          <span className="label-text mb-1">プラットフォーム</span>
          <select className="select select-bordered w-full" disabled>
            <option value="ios">iOS</option>
            <option value="android" disabled>
              Android（近日対応予定）
            </option>
          </select>
        </label>

        <label className="form-control w-full">
          <span className="label-text mb-1">メールアドレス</span>
          <input
            type="email"
            className="input input-bordered w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <span className="label-text-alt mt-1 text-base-content/50">
            TestFlight の招待に使用されます
          </span>
        </label>

        <div ref={widgetRef} />

        {status === 'error' && (
          <div className="alert alert-error">
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          disabled={!email.trim() || !token || status === 'submitting'}
          onClick={handleNext}
        >
          {status === 'submitting' ? '処理中…' : '次へ'}
        </button>
      </div>

      <BetaTermsModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirm}
        submitting={status === 'submitting'}
      />
    </>
  )
}
