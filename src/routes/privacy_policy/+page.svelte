<script lang="ts">
  import MarkdownArticle from '#lib/components/MarkdownArticle.svelte';
  import Seo from '#lib/components/Seo.svelte';

  let { data } = $props();
</script>

<Seo
  title="プライバシーポリシー | EQMonitor"
  description="本サービスのプライバシーポリシーについて記載しています。"
/>

<MarkdownArticle title="プライバシーポリシー" html={data.html} />
