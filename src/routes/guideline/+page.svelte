<script lang="ts">
  import Seo from '#lib/components/Seo.svelte'
  import MarkdownArticle from '#lib/components/MarkdownArticle.svelte'

  let { data } = $props()
</script>

<Seo title="気象庁ガイドライン対応状況 | EQMonitor" description="緊急地震速報に関する気象庁のガイドラインに対するEQMonitorの対応状況について記載しています。" />

<MarkdownArticle title="緊急地震速報に関する気象庁のガイドライン対応状況 (仮)" html={data.html} />
