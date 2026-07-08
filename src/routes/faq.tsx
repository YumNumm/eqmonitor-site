import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import {
  getAllRenderedFaqSections,
  type RenderedFaqItem,
  type RenderedFaqSection,
} from '~/lib/faq'
import { seo } from '~/utils/seo'

const loadFaqData = createServerFn().handler(() => getAllRenderedFaqSections())

export const Route = createFileRoute('/faq')({
  loader: () => loadFaqData(),
  head: () => ({
    meta: seo({
      title: 'よくある質問 | EQMonitor',
      description:
        'EQMonitor の使い方、通知、トラブルシューティングに関するよくある質問をまとめています。',
    }),
  }),
  component: FaqPage,
})

function FaqPage() {
  const sections = Route.useLoaderData()

  return (
    <div className="p-4 sm:p-8 max-w-[1024px] mx-auto">
      <h1 className="text-3xl font-bold text-center mb-2">よくある質問</h1>
      <p className="text-center text-base-content/70 mb-8">
        EQMonitor に関するよくある質問をまとめています。
      </p>

      {sections.length > 0 && (
        <nav
          aria-label="FAQ セクション"
          className="mb-8 rounded-box border border-base-300 bg-base-100 p-4"
        >
          <h2 className="text-sm font-semibold text-base-content/60 mb-3">
            セクション
          </h2>
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="btn btn-sm btn-ghost border border-base-300"
              >
                {section.title}
              </a>
            ))}
          </div>
        </nav>
      )}

      <div className="space-y-4">
        {sections.length === 0 ? (
          <p className="text-center text-base-content/50 py-16">
            FAQはありません
          </p>
        ) : (
          sections.map((section) => (
            <FaqSectionCard key={section.id} section={section} />
          ))
        )}
      </div>

      <p className="mt-12 text-center text-base-content/50 text-sm">
        解決しない場合は{' '}
        <Link to="/contact" className="link link-accent">
          お問い合わせ
        </Link>{' '}
        からお知らせください。
      </p>
    </div>
  )
}

function FaqSectionCard({ section }: { section: RenderedFaqSection }) {
  const checkboxRef = useRef<HTMLInputElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const hashIds = useMemo(
    () => [section.id, ...section.items.map((item) => item.id)],
    [section],
  )
  const scrollHashIds = useMemo(() => [section.id], [section.id])

  useOpenOnHash(hashIds, scrollHashIds, checkboxRef, sectionRef)

  return (
    <section
      ref={sectionRef}
      className="collapse collapse-arrow bg-base-100 border border-base-300"
    >
      <input
        type="checkbox"
        ref={checkboxRef}
        onChange={() => updateHash(section.id, checkboxRef.current?.checked)}
      />
      <div className="collapse-title pr-10 sm:pr-12">
        <h2 className="text-xl font-bold">{section.title}</h2>
        {section.descriptionHtml && (
          <article
            className="prose prose-sm prose-invert max-w-none mt-2"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: 信頼できる自リポジトリ内 markdown のみ
            dangerouslySetInnerHTML={{ __html: section.descriptionHtml }}
          />
        )}
      </div>
      <div className="collapse-content">
        <div className="space-y-3 pt-1">
          {section.items.map((item) => (
            <FaqItemCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FaqItemCard({ item }: { item: RenderedFaqItem }) {
  const checkboxRef = useRef<HTMLInputElement>(null)
  const itemRef = useRef<HTMLDivElement>(null)
  const hashIds = useMemo(() => [item.id], [item.id])
  const scrollHashIds = useMemo(() => [item.id], [item.id])

  useOpenOnHash(hashIds, scrollHashIds, checkboxRef, itemRef)

  return (
    <div
      ref={itemRef}
      className="collapse collapse-arrow bg-base-200/60 border border-base-300"
    >
      <input
        type="checkbox"
        ref={checkboxRef}
        onChange={() => updateHash(item.id, checkboxRef.current?.checked)}
      />
      <div className="collapse-title pr-10 sm:pr-12">
        <h3 className="font-medium leading-snug">{item.question}</h3>
      </div>
      <div className="collapse-content">
        <article
          className="prose prose-sm prose-invert max-w-none pt-2"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: 信頼できる自リポジトリ内 markdown のみ
          dangerouslySetInnerHTML={{ __html: item.answerHtml }}
        />
      </div>
    </div>
  )
}

function useOpenOnHash(
  hashIds: string[],
  scrollHashIds: string[],
  checkboxRef: RefObject<HTMLInputElement | null>,
  elementRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const syncWithHash = (shouldScroll: boolean) => {
      const hash = decodeURIComponent(window.location.hash.slice(1))
      const shouldOpen = hashIds.includes(hash)

      if (checkboxRef.current) {
        checkboxRef.current.checked = shouldOpen
      }

      if (shouldScroll && scrollHashIds.includes(hash)) {
        elementRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }
    }

    syncWithHash(true)

    const handleHashChange = () => syncWithHash(true)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [checkboxRef, elementRef, hashIds, scrollHashIds])
}

function updateHash(id: string, isOpen: boolean | undefined) {
  if (isOpen) {
    window.history.replaceState(null, '', `#${id}`)
    return
  }

  window.history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search,
  )
}

