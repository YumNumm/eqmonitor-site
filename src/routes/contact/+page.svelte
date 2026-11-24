<script lang="ts">
  import { page } from '$app/state';

  import ContactForm from '#lib/components/ContactForm.svelte';
  import Seo from '#lib/components/Seo.svelte';
  import { readDeviceInfoParams } from '#lib/deviceInfo.ts';

  let { data } = $props();

  const deviceInfo = $derived(readDeviceInfoParams(page.url.searchParams));
</script>

<Seo
  title="お問い合わせ | EQMonitor"
  description="EQMonitor へのお問い合わせ・フィードバック・バグ報告はこちらから。"
/>

<div class="mx-auto max-w-[1024px] p-8">
  <h1 class="mb-2 text-center text-3xl font-bold">お問い合わせ</h1>
  <p class="mb-8 text-center text-base-content/70">
    ご意見・ご要望・不具合のご報告をお寄せください。
  </p>
  <div
    class="mx-auto mb-8 alert max-w-xl border border-info/40 bg-info/20 text-base-content shadow-sm"
  >
    <span>
      いただいたお問い合わせには、基本的に個別の返信は行っておりません。
      ただし、内容はすべて開発者が拝見し、今後の改善の参考にさせていただいています。
    </span>
  </div>
  <ContactForm siteKey={data.siteKey} {deviceInfo} />
</div>
