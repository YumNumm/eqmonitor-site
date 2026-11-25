<script lang="ts">
  import { onMount } from 'svelte';

  const TURNSTILE_SCRIPT =
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

  let { siteKey, token = $bindable('') }: { siteKey: string; token?: string } =
    $props();

  let container: HTMLDivElement;
  let widgetId: string | null = null;

  export function reset() {
    token = '';
    if (globalThis.turnstile && widgetId) {
      globalThis.turnstile.reset(widgetId);
    }
  }

  onMount(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    function renderWidget() {
      if (cancelled || !globalThis.turnstile || widgetId) return;
      widgetId = globalThis.turnstile.render(container, {
        sitekey: siteKey,
        theme: 'auto',
        callback: t => (token = t),
        'expired-callback': () => (token = ''),
        'error-callback': () => (token = ''),
      });
    }

    if (globalThis.turnstile) {
      renderWidget();
    } else if (!document.querySelector(`script[src="${TURNSTILE_SCRIPT}"]`)) {
      const script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      // Workers の型定義と衝突して append の型が Element 用にならないため appendChild を使う
      // oxlint-disable-next-line unicorn/prefer-dom-node-append
      document.head.appendChild(script);
    } else {
      timer = setInterval(() => {
        if (globalThis.turnstile) {
          clearInterval(timer);
          renderWidget();
        }
      }, 200);
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (globalThis.turnstile && widgetId) {
        globalThis.turnstile.remove(widgetId);
      }
      widgetId = null;
    };
  });
</script>

<div bind:this={container}></div>
