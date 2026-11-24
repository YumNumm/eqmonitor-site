<script lang="ts">
  import type { BetaStatus, RegisterResult } from '#lib/betaTypes.ts';

  import { onDestroy } from 'svelte';
  import * as v from 'valibot';

  import { BetaRegistrationFormSchema } from '#lib/betaSchema.ts';

  import BetaTermsModal from './BetaTermsModal.svelte';
  import Turnstile from './Turnstile.svelte';

  type FormStatus = 'idle' | 'submitting' | 'polling' | 'success' | 'error';

  let { siteKey }: { siteKey: string } = $props();

  let turnstile = $state<Turnstile>();
  let token = $state('');
  let email = $state('');
  let showModal = $state(false);
  let status = $state<FormStatus>('idle');
  let errorMsg = $state('');
  let polling: ReturnType<typeof setInterval> | null = null;
  let pollCount = 0;

  function stopPolling() {
    if (polling) clearInterval(polling);
    polling = null;
  }

  onDestroy(stopPolling);

  function startPolling(workflowId: string) {
    status = 'polling';
    pollCount = 0;

    polling = setInterval(async () => {
      pollCount++;

      if (pollCount > 30) {
        stopPolling();
        errorMsg =
          'タイムアウトしました。しばらく経ってからメールをご確認ください。';
        status = 'error';
        return;
      }

      try {
        const res = await fetch(
          `/api/beta/status/${encodeURIComponent(workflowId)}`,
        );
        if (!res.ok) throw new Error(String(res.status));
        const result = (await res.json()) as BetaStatus;

        if (result.status === 'complete') {
          stopPolling();
          status = 'success';
        } else if (result.status === 'errored') {
          stopPolling();
          const errorDetail = result.error;
          errorMsg =
            typeof errorDetail === 'string'
              ? errorDetail
              : (errorDetail?.message ?? '登録処理中にエラーが発生しました。');
          status = 'error';
        }
      } catch {
        stopPolling();
        errorMsg = 'ステータスの取得に失敗しました。';
        status = 'error';
      }
    }, 2000);
  }

  function handleNext() {
    const validated = v.safeParse(BetaRegistrationFormSchema, {
      platform: 'ios',
      email,
      turnstileToken: token,
    });
    if (!validated.success) {
      errorMsg = validated.issues[0].message;
      status = 'error';
      return;
    }
    errorMsg = '';
    showModal = true;
  }

  async function handleConfirm() {
    status = 'submitting';
    errorMsg = '';
    showModal = false;
    try {
      const res = await fetch('/api/beta/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'ios', email, turnstileToken: token }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const result = (await res.json()) as RegisterResult;
      if (result.ok) {
        startPolling(result.workflowId);
      } else {
        if (result.error === 'already_registered') {
          errorMsg = '既にベータプログラムに登録されています。';
        } else if (result.error === 'turnstile_failed') {
          errorMsg = '認証に失敗しました。もう一度お試しください。';
        } else {
          errorMsg = '登録に失敗しました。時間をおいて再度お試しください。';
        }
        status = 'error';
      }
    } catch {
      errorMsg = '通信エラーが発生しました。';
      status = 'error';
    } finally {
      turnstile?.reset();
    }
  }
</script>

{#if status === 'polling'}
  <div class="mx-auto flex max-w-md flex-col items-center gap-4">
    <span class="loading loading-lg loading-spinner"></span>
    <h2 class="text-xl font-bold">ベータプログラム登録中...</h2>
    <p class="text-center text-base-content/70">
      TestFlightへの追加と招待メールの送信を行っています。
      <br />
      このページを開いたままお待ちください。
    </p>
  </div>
{:else if status === 'success'}
  <div class="mx-auto alert max-w-md alert-success">
    <span
      >ベータプログラムへの登録が完了しました。TestFlight
      の招待メールをご確認ください。</span
    >
  </div>
{:else}
  <div class="mx-auto flex max-w-md flex-col gap-4">
    <label class="form-control w-full">
      <span class="label-text mb-1">プラットフォーム</span>
      <select class="select-bordered select w-full" disabled>
        <option value="ios">iOS</option>
        <option value="android" disabled>Android（近日対応予定）</option>
      </select>
    </label>

    <label class="form-control w-full">
      <span class="label-text mb-1">メールアドレス</span>
      <input
        type="email"
        class="input-bordered input w-full"
        bind:value={email}
      />
      <span class="label-text-alt mt-1 text-base-content/50"
        >TestFlight の招待に使用されます</span
      >
    </label>

    <Turnstile bind:this={turnstile} {siteKey} bind:token />

    {#if status === 'error'}
      <div class="alert alert-error">
        <span>{errorMsg}</span>
      </div>
    {/if}

    <button
      type="button"
      class="btn btn-primary"
      disabled={!email.trim() || !token || status === 'submitting'}
      onclick={handleNext}
    >
      {status === 'submitting' ? '処理中…' : '次へ'}
    </button>
  </div>

  <BetaTermsModal
    bind:open={showModal}
    onConfirm={handleConfirm}
    submitting={status === 'submitting'}
  />
{/if}
