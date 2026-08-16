import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <div className="p-12 flex flex-col items-center gap-6 text-center max-w-xl mx-auto w-full">
      <h1 className="font-code text-5xl md:text-6xl font-bold tracking-tight">
        404 Not Found
      </h1>
      <p className="text-base-content/70">
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <iframe
        data-testid="embed-iframe"
        style={{ borderRadius: 12 }}
        src="https://open.spotify.com/embed/track/3KA1V97fnMUNmMGHywtBIj?utm_source=generator&theme=0&si=d98f953e64514d26"
        width="100%"
        height="352"
        frameBorder="0"
        allowFullScreen
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title="Error 404"
      />
      <Link to="/" className="btn btn-primary">
        トップへ戻る
      </Link>
    </div>
  )
}
