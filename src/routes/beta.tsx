import { createFileRoute } from '@tanstack/react-router'
import { seo } from '~/utils/seo'
import { BetaForm } from '~/components/BetaForm'

export const Route = createFileRoute('/beta')({
  head: () => ({
    meta: seo({
      title: 'ベータプログラム | EQMonitor',
      description:
        'EQMonitor v3 ベータプログラムに参加して、最新の機能をいち早く体験しましょう。',
    }),
  }),
  component: BetaPage,
})

function BetaPage() {
  return (
    <div className="p-8 max-w-[1024px] mx-auto">
      <h1 className="text-3xl font-bold mb-2">EQMonitor v3 ベータプログラム</h1>
      <p className="text-base-content/70 mb-8">
        EQMonitor v3の最新機能をいち早く体験できるベータプログラムです。
        <br />
        TestFlight経由で最新ビルドが自動配信されます。
      </p>
      <BetaForm />
    </div>
  )
}
