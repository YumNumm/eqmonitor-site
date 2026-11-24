<script lang="ts">
  let { title, html }: { title: string; html: string } = $props()
</script>

<div class="max-w-[1024px] mx-auto">
  <h1 class="text-4xl font-bold text-center pt-8 pb-4">{title}</h1>
  <article class="prose md:prose-lg lg:prose-xl prose-invert max-w-none p-8">
    {@html html}
  </article>
</div>
