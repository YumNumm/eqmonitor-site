<script lang="ts">
  import { Dialog } from 'bits-ui'
  import type { Snippet } from 'svelte'

  let {
    open = $bindable(false),
    title,
    class: className = '',
    children,
    actions,
  }: {
    open?: boolean
    title: string
    class?: string
    children: Snippet
    actions: Snippet
  } = $props()
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <div class="modal modal-open">
      <Dialog.Content class="modal-box {className}">
        <Dialog.Title class="text-lg font-bold mb-4">{title}</Dialog.Title>
        {@render children()}
        <div class="modal-action">
          {@render actions()}
        </div>
      </Dialog.Content>
      <Dialog.Overlay class="modal-backdrop" />
    </div>
  </Dialog.Portal>
</Dialog.Root>
