import { useState } from 'react'

const TERMS = [
  'アプリケーションはベータ版であり、大量の不具合やバグが含まれています',
  'メイン端末ではなく、別の端末でのみ利用することを強く推奨します',
  '事前の予告なしにサービスの全体もしくは一部が動作停止する可能性があります\n(例: 通知の重複配信, 通知配信停止, 誤った情報の通知/表示, 地震履歴APIの停止)',
  'アプリケーションは自動的に配布されるため、1日に複数回配布される可能性があります',
  '正式版リリース有無に関わらず、事前の予告なしにベータプログラムを終了する可能性があります\n終了した場合には、メール(support@eqmonitor.app)にてお知らせします',
  '要望・不具合があった場合は、フィードバックページにご連絡をお願いいたします\nTwitter(X)でのDMやメンションでも構いません(@YumNumm)\nただし、返信の保証はありません',
] as const

interface BetaTermsModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  submitting: boolean
}

export function BetaTermsModal({
  open,
  onClose,
  onConfirm,
  submitting,
}: BetaTermsModalProps) {
  const [checked, setChecked] = useState<boolean[]>(
    Array(TERMS.length).fill(false),
  )
  const allChecked = checked.every(Boolean)

  function toggle(index: number) {
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)))
  }

  return (
    <dialog className={`modal ${open ? 'modal-open' : ''}`}>
      <div className="modal-box max-w-lg">
        <h3 className="text-lg font-bold mb-4">注意事項</h3>
        <p className="text-sm text-base-content/70 mb-4">
          以下の注意事項をすべて確認し、チェックを入れてください
        </p>
        <div className="flex flex-col gap-3">
          {TERMS.map((term, i) => (
            <label key={i} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-primary mt-1 shrink-0"
                checked={checked[i]}
                onChange={() => toggle(i)}
              />
              <span className="text-sm">{term}</span>
            </label>
          ))}
        </div>
        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={submitting}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!allChecked || submitting}
            onClick={onConfirm}
          >
            {submitting ? '処理中…' : 'ベータプログラムに参加'}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>
          close
        </button>
      </form>
    </dialog>
  )
}
