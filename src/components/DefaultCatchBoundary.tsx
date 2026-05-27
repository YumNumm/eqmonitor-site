import {
  ErrorComponent,
  Link,
  type ErrorComponentProps,
} from '@tanstack/react-router'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  return (
    <div className="p-12 flex flex-col items-center gap-4 text-center">
      <h1 className="text-3xl font-bold">エラーが発生しました</h1>
      <ErrorComponent error={error} />
      <Link to="/" className="btn btn-primary">
        トップへ戻る
      </Link>
    </div>
  )
}
