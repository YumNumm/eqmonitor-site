<script lang="ts">
  import Seo from '#lib/components/Seo.svelte'
  import BetaForm from '#lib/components/BetaForm.svelte'

  let { data } = $props()
</script>

<Seo
  title="ベータプログラム | EQMonitor"
  description="EQMonitor v3 ベータプログラムに参加して、最新の機能をいち早く体験しましょう。"
  image="https://eqmonitor.app/api/og?type=beta&title={encodeURIComponent('ベータプログラム')}"
/>

<div class="p-8 max-w-[1024px] mx-auto">
  <h1 class="text-3xl font-bold mb-2">EQMonitor v3 ベータプログラム</h1>
  <p class="text-base-content/70 mb-8">
    EQMonitor v3の最新機能をいち早く体験できるベータプログラムです。
    <br />
    TestFlight経由で最新ビルドが自動配信されます。
  </p>
  <BetaForm siteKey={data.siteKey} />
</div>
