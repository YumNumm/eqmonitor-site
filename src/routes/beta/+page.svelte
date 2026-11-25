<script lang="ts">
  import BetaForm from '#lib/components/BetaForm.svelte';
  import Seo from '#lib/components/Seo.svelte';

  let { data } = $props();
</script>

<Seo
  title="ベータプログラム | EQMonitor"
  description="EQMonitor v3 ベータプログラムに参加して、最新の機能をいち早く体験しましょう。"
  image="https://eqmonitor.app/api/og?type=beta&title={encodeURIComponent(
    'ベータプログラム',
  )}"
/>

<div class="mx-auto max-w-[1024px] p-8">
  <h1 class="mb-2 text-3xl font-bold">EQMonitor v3 ベータプログラム</h1>
  <p class="mb-8 text-base-content/70">
    EQMonitor v3の最新機能をいち早く体験できるベータプログラムです。
    <br />
    TestFlight経由で最新ビルドが自動配信されます。
  </p>
  <BetaForm siteKey={data.siteKey} />
</div>
