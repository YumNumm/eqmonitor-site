<script lang="ts">
  import type { Snippet } from 'svelte';

  import { Dialog } from 'bits-ui';

  let {
    open = $bindable(false),
    title,
    class: className = '',
    children,
    actions,
  }: {
    open?: boolean;
    title: string;
    class?: string;
    children: Snippet;
    actions: Snippet;
  } = $props();
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <div class="modal-open modal">
      <Dialog.Content class="modal-box {className}">
        <Dialog.Title class="mb-4 text-lg font-bold">{title}</Dialog.Title>
        {@render children()}
        <div class="modal-action">
          {@render actions()}
        </div>
      </Dialog.Content>
      <Dialog.Overlay class="modal-backdrop" />
    </div>
  </Dialog.Portal>
</Dialog.Root>
