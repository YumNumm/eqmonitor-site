import { Hono } from 'hono'
import satori from 'satori'
import { initWasm, Resvg } from '@resvg/resvg-wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import notoSansJPBold from './fonts/NotoSansJP-Bold.ttf'

let wasmReady: Promise<void> | null = null
function ensureWasm() {
  if (!wasmReady) wasmReady = initWasm(resvgWasm as WebAssembly.Module)
  return wasmReady
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_IMAGE_BYTES) return null
    const bytes = new Uint8Array(buf)
    const chunks: string[] = []
    for (let i = 0; i < bytes.length; i += 8192) {
      chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)))
    }
    const type = res.headers.get('Content-Type') || 'image/png'
    return `data:${type};base64,${btoa(chunks.join(''))}`
  } catch {
    return null
  }
}

function titleFontSize(len: number, hasImage: boolean): number {
  if (hasImage) {
    if (len > 40) return 36
    if (len > 25) return 40
    return 44
  }
  if (len > 40) return 42
  if (len > 25) return 48
  return 54
}

const app = new Hono()

app.get('/', async (c) => {
  const title = c.req.query('title')
  if (!title) return c.text('title query parameter is required', 400)
  if (title.length > 200)
    return c.text('title must be 200 characters or fewer', 400)

  const imageUrl = c.req.query('image')
  const [imageData] = await Promise.all([
    imageUrl ? fetchImageAsDataUrl(imageUrl) : null,
    ensureWasm(),
  ])
  const hasImage = !!imageData

  const svg = await satori(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background:
          'linear-gradient(160deg, #0c0f1a 0%, #131728 40%, #1a1f35 100%)',
        fontFamily: 'Noto Sans JP',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative glow — top right */}
      <div
        style={{
          position: 'absolute',
          top: '-120px',
          right: '-80px',
          width: '500px',
          height: '500px',
          borderRadius: '250px',
          background:
            'linear-gradient(135deg, rgba(65, 94, 193, 0.15), rgba(59, 136, 230, 0.05))',
        }}
      />
      {/* Decorative glow — bottom left */}
      <div
        style={{
          position: 'absolute',
          bottom: '-150px',
          left: '-100px',
          width: '400px',
          height: '400px',
          borderRadius: '200px',
          background:
            'linear-gradient(135deg, rgba(91, 224, 216, 0.06), transparent)',
        }}
      />

      {/* Top accent gradient bar */}
      <div
        style={{
          width: '100%',
          height: '4px',
          background: 'linear-gradient(90deg, #3B88E6, #415EC1, #463AA2)',
          flexShrink: 0,
        }}
      />

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          paddingTop: 44,
          paddingRight: 56,
          paddingBottom: 36,
          paddingLeft: 56,
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 6,
              height: 24,
              background: 'linear-gradient(180deg, #3B88E6, #463AA2)',
              borderRadius: 3,
            }}
          />
          <div
            style={{
              fontSize: 22,
              color: '#5be0d8',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            EQMonitor
          </div>
        </div>

        {/* Title area */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            gap: 48,
            marginTop: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              flex: 1,
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontSize: titleFontSize(title.length, hasImage),
                fontWeight: 700,
                color: '#f8f7fd',
                lineHeight: 1.35,
                wordBreak: 'break-word',
              }}
            >
              {title}
            </div>
          </div>
          {hasImage && (
            <img
              src={imageData!}
              style={{
                width: 360,
                height: 360,
                objectFit: 'cover',
                borderRadius: 16,
                border: '1px solid rgba(248, 247, 253, 0.08)',
                flexShrink: 0,
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              fontSize: 18,
              color: 'rgba(248, 247, 253, 0.35)',
              fontWeight: 700,
            }}
          >
            eqmonitor.app
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Noto Sans JP',
          data: notoSansJPBold as unknown as ArrayBuffer,
          weight: 700,
          style: 'normal',
        },
      ],
    },
  )

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  })
  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()

  return new Response(pngBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
})

export default app
