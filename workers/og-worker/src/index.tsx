import { Hono } from 'hono'
import { initWasm, Resvg } from '@resvg/resvg-wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import satori from 'satori'
import appiconPng from './appicon.png'
import googleSansFlexBold from './fonts/GoogleSansFlex-Bold.ttf'
import notoSansJPBold from './fonts/NotoSansJP-Bold.ttf'

let wasmReady: Promise<void> | null = null
function ensureWasm() {
  if (!wasmReady) wasmReady = initWasm(resvgWasm as WebAssembly.Module)
  return wasmReady
}

function bufferToDataUrl(buf: ArrayBuffer, mime: string): string {
  const bytes = new Uint8Array(buf)
  const chunks: string[] = []
  for (let i = 0; i < bytes.length; i += 8192) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)))
  }
  return `data:${mime};base64,${btoa(chunks.join(''))}`
}

const APPICON_DATA_URL = bufferToDataUrl(appiconPng as ArrayBuffer, 'image/png')

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
    const type = res.headers.get('Content-Type') || 'image/png'
    return bufferToDataUrl(buf, type)
  } catch {
    return null
  }
}

function titleFontSize(len: number, hasImage: boolean): number {
  if (hasImage) {
    if (len > 40) return 36
    if (len > 25) return 42
    return 48
  }
  if (len > 60) return 40
  if (len > 40) return 48
  if (len > 25) return 56
  return 64
}

const TYPE_LABEL: Record<string, string> = {
  blog: 'BLOG',
  projects: 'PROJECTS',
  beta: 'BETA',
}

function LabelChip({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        paddingTop: 6,
        paddingBottom: 6,
        paddingLeft: 14,
        paddingRight: 14,
        border: '1.5px solid rgba(248, 247, 253, 0.95)',
        borderRadius: 999,
        fontSize: 18,
        color: '#ffffff',
        fontWeight: 700,
        letterSpacing: '0.22em',
      }}
    >
      {label}
    </div>
  )
}

const app = new Hono()

app.get('/', async (c) => {
  const title = c.req.query('title')
  if (!title) return c.text('title query parameter is required', 400)
  if (title.length > 200)
    return c.text('title must be 200 characters or fewer', 400)

  const typeParam = c.req.query('type')
  const label = typeParam ? TYPE_LABEL[typeParam] : undefined

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
        background: '#0c0f1a',
        fontFamily: 'Google Sans Flex, Noto Sans JP',
        position: 'relative',
        overflow: 'hidden',
        padding: 48,
      }}
    >
      {/* Radial glow — primary (top-right) — mimics body radial-gradient */}
      <div
        style={{
          position: 'absolute',
          top: '-260px',
          right: '-180px',
          width: '780px',
          height: '780px',
          borderRadius: '390px',
          background:
            'radial-gradient(circle, rgba(65, 94, 193, 0.32), rgba(65, 94, 193, 0) 65%)',
        }}
      />
      {/* Radial glow — accent (bottom-left) */}
      <div
        style={{
          position: 'absolute',
          bottom: '-220px',
          left: '-160px',
          width: '640px',
          height: '640px',
          borderRadius: '320px',
          background:
            'radial-gradient(circle, rgba(91, 224, 216, 0.18), rgba(91, 224, 216, 0) 65%)',
        }}
      />

      {/* Floating card */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          width: '100%',
          paddingTop: 56,
          paddingRight: 64,
          paddingBottom: 56,
          paddingLeft: 64,
          flexDirection: 'column',
          background:
            'linear-gradient(160deg, rgba(35, 42, 64, 0.78) 0%, rgba(20, 24, 38, 0.72) 100%)',
          border: '1px solid rgba(248, 247, 253, 0.08)',
          borderRadius: 28,
          boxShadow:
            '0 24px 48px rgba(0, 0, 0, 0.45), 0 1px 0 rgba(248, 247, 253, 0.08) inset',
        }}
      >
        {hasImage ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              justifyContent: 'space-between',
            }}
          >
            {/* Branding: appicon (halo) + EQMonitor + optional type chip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  position: 'relative',
                  width: 80,
                  height: 80,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    background:
                      'radial-gradient(circle, rgba(91, 224, 216, 0.32), rgba(65, 94, 193, 0.16) 50%, rgba(70, 58, 162, 0) 72%)',
                  }}
                />
                <img
                  src={APPICON_DATA_URL}
                  alt=""
                  width={80}
                  height={80}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 18,
                    border: '1px solid rgba(248, 247, 253, 0.14)',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 34,
                  color: '#f8f7fd',
                  fontWeight: 700,
                  letterSpacing: '0.01em',
                }}
              >
                EQMonitor
              </div>
              {label && <LabelChip label={label} />}
            </div>

            {/* Title + thumbnail */}
            <div
              style={{
                display: 'flex',
                flex: 1,
                alignItems: 'center',
                gap: 48,
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
                    fontSize: titleFontSize(title.length, true),
                    fontWeight: 700,
                    color: '#f8f7fd',
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                  }}
                >
                  {title}
                </div>
              </div>
              <img
                src={imageData ?? ''}
                alt=""
                width={320}
                height={320}
                style={{
                  width: 320,
                  height: 320,
                  objectFit: 'cover',
                  borderRadius: 20,
                  border: '1px solid rgba(248, 247, 253, 0.14)',
                  flexShrink: 0,
                }}
              />
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 28,
            }}
          >
            {/* Icon with glow halo */}
            <div
              style={{
                display: 'flex',
                position: 'relative',
                width: 168,
                height: 168,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  width: 220,
                  height: 220,
                  borderRadius: 110,
                  background:
                    'radial-gradient(circle, rgba(91, 224, 216, 0.35), rgba(65, 94, 193, 0.18) 45%, rgba(70, 58, 162, 0) 70%)',
                }}
              />
              <img
                src={APPICON_DATA_URL}
                alt=""
                width={168}
                height={168}
                style={{
                  width: 168,
                  height: 168,
                  borderRadius: 38,
                  border: '1px solid rgba(248, 247, 253, 0.12)',
                }}
              />
            </div>

            {/* Wordmark + optional type chip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
              }}
            >
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 700,
                  color: '#f8f7fd',
                  letterSpacing: '0.01em',
                }}
              >
                EQMonitor
              </div>
              {label && <LabelChip label={label} />}
            </div>

            {/* Page title */}
            <div
              style={{
                display: 'flex',
                maxWidth: 980,
                fontSize: titleFontSize(title.length, false),
                fontWeight: 700,
                color: '#c9cbf0',
                lineHeight: 1.25,
                textAlign: 'center',
                wordBreak: 'break-word',
                justifyContent: 'center',
              }}
            >
              {title}
            </div>
          </div>
        )}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Google Sans Flex',
          data: googleSansFlexBold as unknown as ArrayBuffer,
          weight: 700,
          style: 'normal',
        },
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
