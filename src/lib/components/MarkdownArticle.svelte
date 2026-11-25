<script lang="ts">
  let { title, html, class: className = '' }: { title: string; html: string; class?: string } = $props()
</script>

<div class="max-w-[1024px] mx-auto">
  <h1 class="text-3xl font-bold text-center pt-8 pb-4">{title}</h1>
  <article class="prose prose-invert max-w-none p-8 {className}">
    {@html html}
  </article>
</div>
