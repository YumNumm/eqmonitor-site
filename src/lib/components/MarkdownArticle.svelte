<script lang="ts">
  let {
    title,
    html,
    class: className = '',
  }: { title: string; html: string; class?: string } = $props();
</script>

<div class="mx-auto max-w-[1024px]">
  <h1 class="pt-8 pb-4 text-center text-3xl font-bold">{title}</h1>
  <article class="prose max-w-none p-8 prose-invert {className}">
    {@html html}
  </article>
</div>
