<script lang="ts">
  import type { Action } from 'svelte/action'
  import Seo from '#lib/components/Seo.svelte'
  import type { MilestoneInfo, ProjectItem } from '#lib/projectsSchema.ts'
  import { updateHash } from '#lib/hashCollapse.ts'

  let { data } = $props()

  type Item = ProjectItem & { html: string }

  const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 }

  const PRIORITY_BADGE: Record<string, string> = {
    P0: 'badge-outline border-error text-error',
    P1: 'badge-outline border-warning text-warning',
    P2: 'badge-outline border-accent text-accent',
    P3: 'badge-outline border-base-content/40 text-base-content/60',
  }

  const STATUS_BADGE: Record<string, string> = {
    Backlog: 'badge-outline border-base-content/20 text-base-content/40',
    Ready: 'badge-outline border-base-content/30 text-base-content/50',
    'In progress': 'badge-outline border-info text-info',
    'In review': 'badge-outline border-warning text-warning',
    Done: 'badge-outline border-success text-success',
  }

  function sortByPriority(a: Item, b: Item): number {
    const pa = a.priority ? (PRIORITY_ORDER[a.priority] ?? 99) : 99
    const pb = b.priority ? (PRIORITY_ORDER[b.priority] ?? 99) : 99
    return pa - pb
  }

  function groupByMilestone(items: Item[]): Array<{ milestone: string | null; items: Item[] }> {
    const map = new Map<string | null, Item[]>()
    for (const item of items) {
      const list = map.get(item.milestone) ?? []
      list.push(item)
      map.set(item.milestone, list)
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
    const jst = new Date(new Date(isoString).getTime() + 9 * 60 * 60 * 1000)
    const hours = String(jst.getUTCHours()).padStart(2, '0')
    const minutes = String(jst.getUTCMinutes()).padStart(2, '0')
    return `${jst.getUTCDate()}日 ${hours}:${minutes} JST`
  }

  function formatDueDate(isoString: string): string {
    const date = new Date(isoString)
    return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}/${date.getUTCDate()}`
  }

  function repoNameFromUrl(url: string): string {
    return url.match(/github\.com\/[^/]+\/([^/]+)/)?.[1] ?? ''
  }

  function progressOf(info: MilestoneInfo | undefined) {
    const total = info ? info.openIssues + info.closedIssues : 0
    return { total, progress: info && total > 0 ? (info.closedIssues / total) * 100 : 0 }
  }

  const openOnHash: Action<HTMLInputElement, string> = (checkbox, hashId) => {
    if (decodeURIComponent(window.location.hash.slice(1)) === hashId) {
      checkbox.checked = true
      checkbox.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const groups = $derived(data.projects ? groupByMilestone(data.projects.items) : [])
  const milestoneMap = $derived(new Map((data.projects?.milestones ?? []).map((ms) => [ms.title, ms])))
</script>

<Seo
  title="開発ロードマップ | EQMonitor"
  description="EQMonitor の開発状況・マイルストーン・予定機能を公開しています。"
  image="https://eqmonitor.app/api/og?type=projects&title={encodeURIComponent('開発ロードマップ')}"
/>

{#if !data.projects || data.projects.items.length === 0}
  <div class="p-4 sm:p-8 max-w-[1024px] mx-auto">
    <h1 class="text-3xl font-bold text-center mb-2">プロジェクト</h1>
    <p class="text-center text-base-content/70">データを取得中です。しばらくお待ちください。</p>
  </div>
{:else}
  <div class="p-4 sm:p-8 max-w-[1024px] mx-auto">
    <h1 class="text-3xl font-bold text-center mb-2">プロジェクト</h1>
    <p class="text-center text-base-content/70 mb-1">開発の進捗状況を公開しています。</p>
    <p class="text-center text-base-content/50 text-sm mb-8">
      最終更新: {formatUpdatedAt(data.projects.updatedAt)}
    </p>

    <div class="space-y-8">
      {#each groups as group (group.milestone ?? '__none__')}
        {@const info = group.milestone ? milestoneMap.get(group.milestone) : undefined}
        {@const { total, progress } = progressOf(info)}
        <div>
          <div class="flex items-center justify-between gap-4 flex-wrap mb-2">
            <h2 class="text-xl font-bold">{group.milestone ?? '未分類'}</h2>
            {#if info}
              <div class="flex items-center gap-3 text-sm text-base-content/60">
                {#if info.dueOn}
                  <span>期限: {formatDueDate(info.dueOn)}</span>
                {/if}
                <span>{progress.toFixed(1)}% 完了</span>
              </div>
            {/if}
          </div>
          {#if info && total > 0}
            <div class="w-full bg-base-300 rounded-full h-2 mb-3">
              <div class="bg-accent h-2 rounded-full transition-all" style="width: {progress}%"></div>
            </div>
          {/if}
          <div class="space-y-2">
            {#each group.items as item (item.url)}
              {@const repo = repoNameFromUrl(item.url)}
              {@const hashId = `${repo}#${item.number}`}
              <div class="collapse collapse-arrow bg-base-100 border border-base-300">
                <input
                  type="checkbox"
                  use:openOnHash={hashId}
                  onchange={(e) => updateHash(hashId, e.currentTarget.checked)}
                />
                <div class="collapse-title grid gap-2 pr-10 sm:flex sm:items-center sm:gap-2 sm:pr-12">
                  <span class="font-medium leading-snug sm:order-4 sm:min-w-0">{item.title}</span>
                  <div class="flex flex-wrap items-center gap-2 sm:contents">
                    {#if item.priority}
                      <span class="badge badge-sm sm:order-1 {PRIORITY_BADGE[item.priority]}">{item.priority}</span>
                    {/if}
                    {#if item.status}
                      <span
                        class="badge badge-sm sm:order-2 {STATUS_BADGE[item.status] ??
                          'badge-outline border-base-content/30 text-base-content/50'}"
                      >
                        {item.status}
                      </span>
                    {/if}
                    <span class="text-base-content/35 text-sm sm:order-3">#{item.number}</span>
                    {#if repo}
                      <span class="badge badge-sm badge-ghost text-base-content/40 text-xs sm:order-5 sm:ml-auto">
                        {repo}
                      </span>
                    {/if}
                  </div>
                </div>
                <div class="collapse-content">
                  {#if item.html}
                    <article class="prose prose-sm prose-invert max-w-none">{@html item.html}</article>
                  {/if}
                  <div class="mt-4">
                    <a href={item.url} target="_blank" rel="noreferrer" class="btn btn-sm btn-ghost text-base-content/40">
                      GitHub で開く
                    </a>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <p class="mt-12 text-center text-base-content/50 text-sm">
      機能のリクエストや不具合の報告は <a href="/contact" class="link link-accent">お問い合わせフォーム</a> からお願いします。
    </p>
  </div>
{/if}
