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
    <a href="/" class="btn btn-primary">トップへ戻る</a>
  </div>
{:else}
  <div class="flex flex-col items-center gap-4 p-12 text-center">
    <h1 class="text-3xl font-bold">エラーが発生しました</h1>
    <p class="text-base-content/70">{page.error?.message}</p>
    <a href="/" class="btn btn-primary">トップへ戻る</a>
  </div>
{/if}
