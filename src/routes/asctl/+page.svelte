<script lang="ts">
  import MarkdownArticle from '#lib/components/MarkdownArticle.svelte';
  import Seo from '#lib/components/Seo.svelte';

  let { data } = $props();
</script>

<Seo
  title="特定商取引法に基づく表記 | EQMonitor"
  description="特定商取引法に基づく表記を記載しています。"
/>

<MarkdownArticle
  title="特定商取引法に基づく表記"
  html={data.html}
  class="md:[&_td:first-child]:whitespace-nowrap"
/>
