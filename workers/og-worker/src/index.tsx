import { Hono } from 'hono'
import satori from 'satori'
import { initWasm, Resvg } from '@resvg/resvg-wasm'
// @ts-expect-error — binary import handled by Wrangler rules
import resvgWasm from '../node_modules/@resvg/resvg-wasm/index_bg.wasm'
import notoSansJPBold from './fonts/NotoSansJP-Bold.ttf'

let wasmInitialized = false

const app = new Hono()

app.get('/', async (c) => {
  const title = c.req.query('title')
  if (!title) {
    return c.text('title query parameter is required', 400)
  }

  if (!wasmInitialized) {
    await initWasm(resvgWasm as WebAssembly.Module)
    wasmInitialized = true
  }

  const svg = await satori(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '60px 80px',
        background:
          'linear-gradient(135deg, #0c0f1a 0%, #141826 50%, #232a40 100%)',
        fontFamily: 'Noto Sans JP',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '40px',
        }}
      >
        <div
          style={{
            fontSize: '28px',
            color: '#5be0d8',
            fontWeight: 700,
          }}
        >
          EQMonitor Blog
        </div>
      </div>
      <div
        style={{
          fontSize: title.length > 30 ? '48px' : '56px',
          fontWeight: 700,
          color: '#f8f7fd',
          lineHeight: 1.3,
          wordBreak: 'break-word',
        }}
      >
        {title}
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
