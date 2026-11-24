<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>{page.status === 404 ? '404 Not Found' : 'エラー'} | EQMonitor</title>
</svelte:head>

{#if page.status === 404}
  <div
    class="mx-auto flex w-full max-w-xl flex-col items-center gap-6 p-12 text-center"
  >
    <h1 class="font-code text-5xl font-bold tracking-tight md:text-6xl">
      404 Not Found
    </h1>
    <p class="text-base-content/70">
      お探しのページは存在しないか、移動した可能性があります。
    </p>
    <iframe
      data-testid="embed-iframe"
      style="border-radius: 12px"
      src="https://open.spotify.com/embed/track/3KA1V97fnMUNmMGHywtBIj?utm_source=generator&theme=0&si=d98f953e64514d26"
      width="100%"
      height="352"
      frameborder="0"
      allowfullscreen
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      title="Error 404"
    ></iframe>
    <a href="/" class="btn btn-primary">トップへ戻る</a>
  </div>
{:else}
  <div class="flex flex-col items-center gap-4 p-12 text-center">
    <h1 class="text-3xl font-bold">エラーが発生しました</h1>
    <p class="text-base-content/70">{page.error?.message}</p>
    <a href="/" class="btn btn-primary">トップへ戻る</a>
  </div>
{/if}
