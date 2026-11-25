<script lang="ts">
  import Seo from '#lib/components/Seo.svelte'
  import MarkdownArticle from '#lib/components/MarkdownArticle.svelte'

  let { data } = $props()
</script>

<Seo title="利用規約 | EQMonitor" description="本サービスの利用規約について記載しています。" />

<MarkdownArticle title="利用規約" html={data.html} />
