<script lang="ts">
  import Modal from './Modal.svelte'

  const TERMS = [
    'アプリケーションはベータ版であり、大量の不具合やバグが含まれています',
    'メイン端末ではなく、別の端末でのみ利用することを強く推奨します',
    '事前の予告なしにサービスの全体もしくは一部が動作停止する可能性があります\n(例: 通知の重複配信, 通知配信停止, 誤った情報の通知/表示, 地震履歴APIの停止)',
    'アプリケーションは自動的に配布されるため、1日に複数回配布される可能性があります',
    '正式版リリース有無に関わらず、事前の予告なしにベータプログラムを終了する可能性があります\n終了した場合には、メール(support@eqmonitor.app)にてお知らせします',
    '要望・不具合があった場合は、フィードバックページにご連絡をお願いいたします\nTwitter(X)でのDMやメンションでも構いません(@YumNumm)\nただし、返信の保証はありません',
  ] as const

  let {
    open = $bindable(false),
    onConfirm,
    submitting,
  }: { open?: boolean; onConfirm: () => void; submitting: boolean } = $props()

  let checked = $state<boolean[]>(TERMS.map(() => false))
  const allChecked = $derived(checked.every(Boolean))
</script>

<Modal bind:open title="注意事項" class="max-w-lg">
  <p class="text-sm text-base-content/70 mb-4">以下の注意事項をすべて確認し、チェックを入れてください</p>
  <div class="flex flex-col gap-3">
    {#each TERMS as term, i (i)}
      <label class="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" class="checkbox checkbox-primary mt-1 shrink-0" bind:checked={checked[i]} />
        <span class="text-sm">{term}</span>
      </label>
    {/each}
  </div>
  {#snippet actions()}
    <button type="button" class="btn btn-ghost" onclick={() => (open = false)} disabled={submitting}>
      キャンセル
    </button>
    <button type="button" class="btn btn-primary" disabled={!allChecked || submitting} onclick={onConfirm}>
      {submitting ? '処理中…' : 'ベータプログラムに参加'}
    </button>
  {/snippet}
</Modal>
