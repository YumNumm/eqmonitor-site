import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { appEnv } from '~/server/env'
import { seo } from '~/utils/seo'
import { ContactForm } from '~/components/ContactForm'
import { validateContactSearch } from '~/lib/contactSearchSchema'

// site key は public だが、ランタイムの env から取得することで
// 再ビルドなしに鍵を差し替えられるようにする。
const getSiteKey = createServerFn().handler(() => {
  return { siteKey: appEnv.TURNSTILE_SITE_KEY }
})

export const Route = createFileRoute('/contact')({
  validateSearch: validateContactSearch,
  head: () => ({
    meta: seo({
      title: 'お問い合わせ | EQMonitor',
      description:
        'EQMonitor へのお問い合わせ・フィードバック・バグ報告はこちらから。',
    }),
  }),
  loader: () => getSiteKey(),
  component: Contact,
})

function Contact() {
  const { siteKey } = Route.useLoaderData()
  const search = Route.useSearch()

  // At least one device-related param must be present to treat as WebView context
  const hasDeviceInfo = !!(
    search.deviceId ||
    search.appVersion ||
    search.buildNumber ||
    search.os ||
    search.deviceInfo
  )

  return (
    <div className="p-8 max-w-[1024px] mx-auto">
      <h1 className="text-3xl font-bold text-center mb-2">お問い合わせ</h1>
      <p className="text-center text-base-content/70 mb-8">
        ご意見・ご要望・不具合のご報告をお寄せください。
      </p>
      <div className="alert alert-info max-w-xl mx-auto mb-8">
        <span>
          いただいたお問い合わせには、基本的に個別の返信は行っておりません。
          ただし、内容はすべて開発者が拝見し、今後の改善の参考にさせていただいています。
        </span>
      </div>
      <ContactForm
        siteKey={siteKey}
        deviceInfo={hasDeviceInfo ? search : undefined}
      />
    </div>
  )
}
