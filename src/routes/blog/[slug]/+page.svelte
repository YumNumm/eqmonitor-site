<script lang="ts">
  import Seo from '#lib/components/Seo.svelte'

  let { data } = $props()

  const post = $derived(data.post)
  const ogImage = $derived.by(() => {
    const params = new URLSearchParams({ type: 'blog', title: post.title })
    if (post.image) {
      params.set('image', post.image.startsWith('http') ? post.image : `https://eqmonitor.app${post.image}`)
    }
    return `https://eqmonitor.app/api/og?${params}`
  })
</script>

<Seo title="{post.title} | EQMonitor Blog" description={post.description} image={ogImage} />

<div class="max-w-[1024px] mx-auto">
  <div class="pt-8 pb-4 px-8">
    <p class="text-base-content/60 text-sm text-center">{post.date}</p>
    <h1 class="text-4xl font-bold text-center mt-2">{post.title}</h1>
    {#if post.tags.length > 0}
      <div class="flex justify-center gap-2 mt-4">
        {#each post.tags as tag (tag)}
          <span class="badge badge-sm badge-outline">{tag}</span>
        {/each}
      </div>
    {/if}
  </div>
  <article class="prose prose-invert max-w-none p-8">{@html post.html}</article>
</div>
