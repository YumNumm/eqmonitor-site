<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children }: { children: Snippet } = $props()
</script>

<div class="p-6 w-full max-w-[1024px] mx-auto">{@render children()}</div>
