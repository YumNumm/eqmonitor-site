<script lang="ts">
  import Seo from '#lib/components/Seo.svelte'
  import MarkdownArticle from '#lib/components/MarkdownArticle.svelte'

  let { data } = $props()
</script>

<Seo title="特定商取引法に基づく表記 | EQMonitor" description="特定商取引法に基づく表記を記載しています。" />

<MarkdownArticle title="特定商取引法に基づく表記" html={data.html} />
