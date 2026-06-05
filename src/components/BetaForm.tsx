import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import * as v from 'valibot'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, SignIn } from '@better-auth-ui/heroui'
import { HeroUIProvider } from '@heroui/react'
import { authClient } from '~/server/auth-client'
import { BetaRegistrationFormSchema } from '~/lib/betaSchema'
import { BetaTermsModal } from './BetaTermsModal'

type Status = 'idle' | 'submitting' | 'success' | 'error'

const queryClient = new QueryClient()

function BetaFormInner() {
  const [email, setEmail] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const session = authClient.useSession()

  if (session.isPending) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (!session.data) {
    return (
      <div className="max-w-md mx-auto">
        <p className="text-base-content/70 mb-6 text-center">
          ベータプログラムに参加するには、Apple
          アカウントでサインインしてください。
        </p>
        <SignIn socialLayout="horizontal" />
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="alert alert-success max-w-md mx-auto">
        <span>
          ベータプログラムへの参加登録が完了しました。TestFlight
          への招待をお待ちください。
        </span>
      </div>
    )
  }

  function handleNext() {
    const validated = v.safeParse(BetaRegistrationFormSchema, {
      platform: 'ios',
      email,
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
    try {
      const res = await fetch('/api/beta/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'ios', email }),
      })
      if (res.ok) {
        setStatus('success')
        setShowModal(false)
      } else {
        const data = await res.json().catch(() => ({}))
        const error = (data as { error?: string }).error
        if (error === 'already_registered') {
          setErrorMsg('既にベータプログラムに登録されています。')
        } else {
          setErrorMsg('登録に失敗しました。時間をおいて再度お試しください。')
        }
        setStatus('error')
        setShowModal(false)
      }
    } catch {
      setErrorMsg('通信エラーが発生しました。')
      setStatus('error')
      setShowModal(false)
    }
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

        {status === 'error' && (
          <div className="alert alert-error">
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          disabled={!email.trim() || status === 'submitting'}
          onClick={handleNext}
        >
          次へ
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

export function BetaForm() {
  const router = useRouter()
  return (
    <QueryClientProvider client={queryClient}>
      <HeroUIProvider>
        <AuthProvider
          authClient={authClient}
          navigate={({ to, replace }) => router.navigate({ to, replace })}
          socialProviders={['apple']}
        >
          <BetaFormInner />
        </AuthProvider>
      </HeroUIProvider>
    </QueryClientProvider>
  )
}
