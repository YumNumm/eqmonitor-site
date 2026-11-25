<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<div class="mx-auto w-full max-w-[1024px] p-6">{@render children()}</div>
