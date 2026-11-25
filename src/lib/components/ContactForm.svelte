<script lang="ts">
  import type { DeviceInfoParams } from '#lib/deviceInfo.ts';

  import * as v from 'valibot';

  import {
    formatDeviceInfoJson,
    serializeDeviceInfo,
  } from '#lib/deviceInfo.ts';
  import { ContactFormSchema } from '#lib/inquirySchema.ts';

  import Modal from './Modal.svelte';
  import Turnstile from './Turnstile.svelte';

  const InquiryErrorSchema = v.object({
    error: v.optional(v.string()),
  });

  type Status = 'idle' | 'submitting' | 'success' | 'error';

  let {
    siteKey,
    deviceInfo,
  }: { siteKey: string; deviceInfo?: DeviceInfoParams } = $props();

  let turnstile = $state<Turnstile>();
  let token = $state('');
  let type = $state<'inquiry' | 'feedback' | 'bug'>('inquiry');
  let name = $state('');
  let email = $state('');
  let subject = $state('');
  let message = $state('');
  let status = $state<Status>('idle');
  let errorMsg = $state('');
  let includeDeviceInfo = $state(true);
  let showDeviceInfoModal = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!token) {
      errorMsg = '認証を完了してください';
      status = 'error';
      return;
    }

    const validated = v.safeParse(ContactFormSchema, {
      type,
      name,
      email,
      subject,
      message,
    });
    if (!validated.success) {
      errorMsg = validated.issues[0].message;
      status = 'error';
      return;
    }

    status = 'submitting';
    errorMsg = '';
    try {
      const device_info =
        deviceInfo && includeDeviceInfo
          ? serializeDeviceInfo(deviceInfo)
          : undefined;

      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          ...validated.output,
          ...(device_info === undefined ? {} : { device_info }),
        }),
      });
      if (res.ok) {
        status = 'success';
        name = '';
        email = '';
        subject = '';
        message = '';
      } else {
        const raw = await res.json().catch(() => ({}));
        const parsed = v.safeParse(InquiryErrorSchema, raw);
        const error = parsed.success ? parsed.output.error : undefined;
        errorMsg =
          error === 'turnstile_failed'
            ? '認証に失敗しました。もう一度お試しください。'
            : '送信に失敗しました。時間をおいて再度お試しください。';
        status = 'error';
      }
    } catch {
      errorMsg = '通信エラーが発生しました。';
      status = 'error';
    } finally {
      turnstile?.reset();
    }
  }

  const canSubmit = $derived(
    status !== 'submitting' &&
      Boolean(name.trim()) &&
      Boolean(email.trim()) &&
      Boolean(subject.trim()) &&
      Boolean(message.trim()) &&
      Boolean(token),
  );
</script>

{#if status === 'success'}
  <div class="mx-auto alert max-w-xl alert-success">
    <span
      >送信しました。お問い合わせありがとうございます。
      内容を確認のうえ対応いたします。</span
    >
  </div>
{:else}
  <form onsubmit={handleSubmit} class="mx-auto flex max-w-xl flex-col gap-4">
    {#if deviceInfo}
      <div
        class="flex items-center justify-between rounded-lg border border-base-300 px-4 py-3"
      >
        <div class="flex items-center gap-3">
          <input
            type="checkbox"
            class="toggle toggle-primary"
            bind:checked={includeDeviceInfo}
          />
          <div>
            <p class="text-sm font-medium">端末情報を送信に含める</p>
            <p class="text-xs text-base-content/60">
              問題の調査に役立ちます。
              <button
                type="button"
                class="link link-primary"
                onclick={() => (showDeviceInfoModal = true)}
              >
                含まれる情報
              </button>
            </p>
          </div>
        </div>
      </div>
    {/if}

    <label class="form-control w-full">
      <span class="label-text mb-1">種別</span>
      <select class="select-bordered select w-full" bind:value={type}>
        <option value="inquiry">問い合わせ</option>
        <option value="feedback">フィードバック</option>
        <option value="bug">バグ報告</option>
      </select>
    </label>

    <label class="form-control w-full">
      <span class="label-text mb-1">お名前(ニックネーム可)</span>
      <input
        type="text"
        class="input-bordered input w-full"
        bind:value={name}
        required
        maxlength={100}
      />
    </label>

    <label class="form-control w-full">
      <span class="label-text mb-1">メールアドレス</span>
      <input
        type="email"
        class="input-bordered input w-full"
        bind:value={email}
        required
      />
    </label>

    <label class="form-control w-full">
      <span class="label-text mb-1">件名</span>
      <input
        type="text"
        class="input-bordered input w-full"
        bind:value={subject}
        required
        maxlength={200}
        placeholder="お問い合わせの件名"
      />
    </label>

    <label class="form-control w-full">
      <span class="label-text mb-1">本文</span>
      <textarea
        class="textarea-bordered textarea min-h-40 w-full"
        bind:value={message}
        required
        maxlength={5000}
        placeholder="ご意見・ご要望・不具合の内容をご記入ください"></textarea>
    </label>

    <Turnstile bind:this={turnstile} {siteKey} bind:token />

    {#if status === 'error'}
      <div class="alert alert-error">
        <span>{errorMsg}</span>
      </div>
    {/if}

    <p class="text-sm text-base-content/70">
      送信することで<a href="/privacy_policy" class="link link-primary"
        >プライバシーポリシー</a
      >に同意したものとみなします。
    </p>

    <button type="submit" class="btn btn-primary" disabled={!canSubmit}>
      {status === 'submitting'
        ? '送信中…'
        : 'プライバシーポリシーに同意して送信する'}
    </button>
  </form>

  {#if deviceInfo}
    <Modal
      bind:open={showDeviceInfoModal}
      title="送信される端末情報"
      class="max-w-lg"
    >
      <div class="flex flex-col gap-2 text-sm">
        {#if deviceInfo.deviceId}
          <p>
            <span class="font-medium">Device ID:</span>
            {deviceInfo.deviceId}
          </p>
        {/if}
        {#if deviceInfo.appVersion}
          <p>
            <span class="font-medium">App Version:</span>
            {deviceInfo.appVersion}
          </p>
        {/if}
        {#if deviceInfo.buildNumber}
          <p>
            <span class="font-medium">Build Number:</span>
            {deviceInfo.buildNumber}
          </p>
        {/if}
        {#if deviceInfo.os}
          <p><span class="font-medium">OS:</span> {deviceInfo.os}</p>
        {/if}
        {#if deviceInfo.deviceInfo}
          <div>
            <p class="mb-1 font-medium">Device Info:</p>
            <pre
              class="overflow-x-auto rounded-lg bg-base-200 p-3 text-xs break-all whitespace-pre-wrap">{formatDeviceInfoJson(
                deviceInfo.deviceInfo,
              )}</pre>
          </div>
        {/if}
      </div>
      {#snippet actions()}
        <button
          type="button"
          class="btn"
          onclick={() => (showDeviceInfoModal = false)}>閉じる</button
        >
      {/snippet}
    </Modal>
  {/if}
{/if}
