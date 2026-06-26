import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { marked } from 'marked'
import type { MilestoneInfo, ProjectItem } from '~/lib/projectsSchema'
import { appEnv } from '~/server/env'
import { getProjectsData } from '~/server/projects'

const loadProjectsData = createServerFn().handler(async () => {
  return await getProjectsData(appEnv.PROJECTS_KV)
})

export const Route = createFileRoute('/projects')({
  loader: () => loadProjectsData(),
  component: ProjectsPage,
})

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 }

const PRIORITY_BADGE: Record<string, string> = {
  P0: 'badge-error text-error-content',
  P1: 'badge-warning text-warning-content',
  P2: 'badge-info text-info-content',
  P3: 'badge-success text-success-content',
}

function sortByPriority(a: ProjectItem, b: ProjectItem): number {
  const pa = a.priority ? PRIORITY_ORDER[a.priority] ?? 99 : 99
  const pb = b.priority ? PRIORITY_ORDER[b.priority] ?? 99 : 99
  return pa - pb
}

function groupByMilestone(
  items: ProjectItem[],
): Array<{ milestone: string | null; items: ProjectItem[] }> {
  const map = new Map<string | null, ProjectItem[]>()
  for (const item of items) {
    const key = item.milestone
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  }

  const groups = Array.from(map.entries()).map(([milestone, groupItems]) => ({
    milestone,
    items: groupItems.sort(sortByPriority),
  }))

  groups.sort((a, b) => {
    if (a.milestone === null) return 1
    if (b.milestone === null) return -1
    return a.milestone.localeCompare(b.milestone)
  })

  return groups
}

function formatUpdatedAt(isoString: string): string {
  const date = new Date(isoString)
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  const day = jst.getUTCDate()
  const hours = String(jst.getUTCHours()).padStart(2, '0')
  const minutes = String(jst.getUTCMinutes()).padStart(2, '0')
  return `${day}日 ${hours}:${minutes}`
}

function formatDueDate(isoString: string): string {
  const date = new Date(isoString)
  return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}/${date.getUTCDate()}`
}

function ProjectsPage() {
  const data = Route.useLoaderData()

  if (!data || data.items.length === 0) {
    return (
      <div className="p-8 max-w-[1024px] mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">プロジェクト</h1>
        <p className="text-center text-base-content/70">
          データを取得中です。しばらくお待ちください。
        </p>
      </div>
    )
  }

  const groups = groupByMilestone(data.items)
  const milestoneMap = new Map(
    (data.milestones ?? []).map((ms) => [ms.title, ms]),
  )

  return (
    <div className="p-8 max-w-[1024px] mx-auto">
      <h1 className="text-3xl font-bold text-center mb-2">プロジェクト</h1>
      <p className="text-center text-base-content/70 mb-1">
        開発の進捗状況を公開しています。
      </p>
      <p className="text-center text-base-content/50 text-sm mb-8">
        最終更新: {formatUpdatedAt(data.updatedAt)}
      </p>

      <div className="space-y-8">
        {groups.map((group) => (
          <MilestoneGroup
            key={group.milestone ?? '__none__'}
            milestone={group.milestone}
            milestoneInfo={
              group.milestone ? milestoneMap.get(group.milestone) : undefined
            }
            items={group.items}
          />
        ))}
      </div>

      <div className="alert mt-12 border border-info/40 bg-info/20 text-base-content shadow-sm">
        <div>
          <p>
            機能のリクエストや不具合の報告は{' '}
            <Link to="/contact" className="link link-info">
              お問い合わせフォーム
            </Link>{' '}
            からお願いします。
          </p>
        </div>
      </div>
    </div>
  )
}

function MilestoneGroup({
  milestone,
  milestoneInfo,
  items,
}: {
  milestone: string | null
  milestoneInfo?: MilestoneInfo
  items: ProjectItem[]
}) {
  const total = milestoneInfo
    ? milestoneInfo.openIssues + milestoneInfo.closedIssues
    : 0
  const progress = total > 0 ? Math.round((milestoneInfo!.closedIssues / total) * 100) : 0

  return (
    <div className="card bg-base-200/50 shadow">
      <div className="card-body">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="card-title text-xl">{milestone ?? '未分類'}</h2>
          {milestoneInfo && (
            <div className="flex items-center gap-3 text-sm text-base-content/60">
              {milestoneInfo.dueOn && (
                <span>期限: {formatDueDate(milestoneInfo.dueOn)}</span>
              )}
              <span>
                {milestoneInfo.closedIssues}/{total} 完了
              </span>
            </div>
          )}
        </div>
        {milestoneInfo && total > 0 && (
          <progress
            className="progress progress-primary w-full"
            value={progress}
            max={100}
          />
        )}
        <div className="space-y-2">
          {items.map((item) => (
            <ProjectItemCard key={item.url} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

const markedWithSafeHtml = marked.use({
  renderer: {
    html(token) {
      return token.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    },
  },
})

function repoNameFromUrl(url: string): string {
  const match = url.match(/github\.com\/[^/]+\/([^/]+)/)
  return match?.[1] ?? ''
}

function ProjectItemCard({ item }: { item: ProjectItem }) {
  const html = item.body
    ? (markedWithSafeHtml.parse(item.body, { async: false }) as string)
    : ''
  const repo = repoNameFromUrl(item.url)

  return (
    <div className="collapse collapse-arrow bg-base-100">
      <input type="checkbox" />
      <div className="collapse-title flex items-center gap-2">
        {item.priority && (
          <span className={`badge badge-sm ${PRIORITY_BADGE[item.priority]}`}>
            {item.priority}
          </span>
        )}
        <span className="font-medium">{item.title}</span>
        {repo && (
          <span className="ml-auto badge badge-sm badge-ghost text-base-content/50">
            {repo}
          </span>
        )}
      </div>
      <div className="collapse-content">
        {html && (
          <article
            className="prose prose-sm prose-invert max-w-none"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: GitHub Issue body from KV cache
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
        <div className="mt-4">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm btn-ghost text-base-content/50"
          >
            GitHub で開く
          </a>
        </div>
      </div>
    </div>
  )
}
