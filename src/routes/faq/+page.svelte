<script lang="ts">
  import Seo from '#lib/components/Seo.svelte';
  import { hashCollapse, updateHash } from '#lib/hashCollapse.ts';

  let { data } = $props();
</script>

<Seo
  title="よくある質問 | EQMonitor"
  description="EQMonitor の使い方、通知、トラブルシューティングに関するよくある質問をまとめています。"
/>

<div class="mx-auto max-w-[1024px] p-4 sm:p-8">
  <h1 class="mb-2 text-center text-3xl font-bold">よくある質問</h1>
  <p class="mb-8 text-center text-base-content/70">
    EQMonitor に関するよくある質問をまとめています。
  </p>

  {#if data.sections.length > 0}
    <nav
      aria-label="FAQ セクション"
      class="mb-8 rounded-box border border-base-300 bg-base-100 p-4"
    >
      <h2 class="mb-3 text-sm font-semibold text-base-content/60">
        セクション
      </h2>
      <div class="flex flex-wrap gap-2">
        {#each data.sections as section (section.id)}
          <a
            href="#{section.id}"
            class="btn border border-base-300 btn-ghost btn-sm"
            >{section.title}</a
          >
        {/each}
      </div>
    </nav>
  {/if}

  <div class="space-y-4">
    {#if data.sections.length === 0}
      <p class="py-16 text-center text-base-content/50">FAQはありません</p>
    {:else}
      {#each data.sections as section (section.id)}
        <section
          id={section.id}
          class="collapse-arrow collapse border border-base-300 bg-base-100"
        >
          <input
            type="checkbox"
            use:hashCollapse={{
              openIds: [section.id, ...section.items.map(item => item.id)],
              scrollIds: [section.id],
            }}
            onchange={e => updateHash(section.id, e.currentTarget.checked)}
          />
          <div class="collapse-title pr-10 sm:pr-12">
            <h2 class="text-xl font-bold">{section.title}</h2>
            {#if section.descriptionHtml}
              <article class="prose prose-sm mt-2 max-w-none prose-invert">
                {@html section.descriptionHtml}
              </article>
            {/if}
          </div>
          <div class="collapse-content">
            <div class="space-y-3 pt-1">
              {#each section.items as item (item.id)}
                <div
                  id={item.id}
                  class="collapse-arrow collapse border border-base-300 bg-base-200/60"
                >
                  <input
                    type="checkbox"
                    use:hashCollapse={{
                      openIds: [item.id],
                      scrollIds: [item.id],
                    }}
                    onchange={e => updateHash(item.id, e.currentTarget.checked)}
                  />
                  <div class="collapse-title pr-10 sm:pr-12">
                    <h3 class="leading-snug font-medium">{item.question}</h3>
                  </div>
                  <div class="collapse-content">
                    <article
                      class="prose prose-sm max-w-none pt-2 prose-invert"
                    >
                      {@html item.answerHtml}
                    </article>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </section>
      {/each}
    {/if}
  </div>

  <p class="mt-12 text-center text-sm text-base-content/50">
    解決しない場合は <a href="/contact" class="link link-accent">お問い合わせ</a
    > からお知らせください。
  </p>
</div>
