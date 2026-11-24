<script lang="ts">
  import Seo from '#lib/components/Seo.svelte';

  let { data } = $props();
</script>

<Seo title="Blog | EQMonitor" description="EQMonitor の技術ブログ" />

<div class="mx-auto max-w-[1024px] p-8">
  <h1 class="pt-8 pb-8 text-center text-4xl font-bold">Blog</h1>
  <div class="space-y-6">
    {#each data.posts as post (post.slug)}
      <a href="/blog/{post.slug}" class="block">
        <article
          class="card border border-base-300 bg-base-200/50 transition-colors hover:border-primary/50"
        >
          <div class="card-body">
            <h2 class="card-title text-xl">{post.title}</h2>
            <p class="text-sm text-base-content/60">{post.date}</p>
            <p class="text-base-content/80">{post.description}</p>
            {#if post.tags.length > 0}
              <div class="mt-2 flex gap-2">
                {#each post.tags as tag (tag)}
                  <span class="badge badge-outline badge-sm">{tag}</span>
                {/each}
              </div>
            {/if}
          </div>
        </article>
      </a>
    {/each}
  </div>
</div>
