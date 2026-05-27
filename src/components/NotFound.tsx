import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <div className="p-12 flex flex-col items-center gap-4 text-center">
      <h1 className="text-3xl font-bold">404 - ページが見つかりません</h1>
      <p className="text-base-content/70">
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <Link to="/" className="btn btn-primary">
        トップへ戻る
      </Link>
    </div>
  )
}
