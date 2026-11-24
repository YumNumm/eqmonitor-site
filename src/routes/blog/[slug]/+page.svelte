<script lang="ts">
  import Seo from '#lib/components/Seo.svelte';

  let { data } = $props();

  const post = $derived(data.post);
  const ogImage = $derived.by(() => {
    const params = new URLSearchParams({ type: 'blog', title: post.title });
    if (post.image) {
      params.set(
        'image',
        post.image.startsWith('http')
          ? post.image
          : `https://eqmonitor.app${post.image}`,
      );
    }
    return `https://eqmonitor.app/api/og?${params}`;
  });
</script>

<Seo
  title="{post.title} | EQMonitor Blog"
  description={post.description}
  image={ogImage}
/>

<div class="mx-auto max-w-[1024px]">
  <div class="px-8 pt-8 pb-4">
    <p class="text-center text-sm text-base-content/60">{post.date}</p>
    <h1 class="mt-2 text-center text-4xl font-bold">{post.title}</h1>
    {#if post.tags.length > 0}
      <div class="mt-4 flex justify-center gap-2">
        {#each post.tags as tag (tag)}
          <span class="badge badge-outline badge-sm">{tag}</span>
        {/each}
      </div>
    {/if}
  </div>
  <article class="prose max-w-none p-8 prose-invert">{@html post.html}</article>
</div>
