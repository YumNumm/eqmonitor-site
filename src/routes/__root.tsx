/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import type * as React from 'react'
import { Navbar } from '~/components/Navbar'
import { Footer } from '~/components/Footer'
import { DefaultCatchBoundary } from '~/components/DefaultCatchBoundary'
import { NotFound } from '~/components/NotFound'
import { seo } from '~/utils/seo'
import appCss from '~/styles/app.css?url'

const TITLE = 'EQMonitor 地震速報'
const DESCRIPTION =
  'EQMonitorは、日本全国の地震情報をいち早く受信できるアプリケーションです。'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width' },
      { name: 'apple-itunes-app', content: 'app-id=6447546703' },
      { name: 'og:image', content: '/assets/header.png' },
      ...seo({ title: TITLE, description: DESCRIPTION }),
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/webp', href: '/favicon.webp' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@100..900&family=Roboto+Mono:wght@600&display=swap',
      },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" data-theme="night" className="h-full">
      <head>
        <HeadContent />
      </head>
      <body className="h-full">
        <Navbar />
        {children}
        <div className="sticky" style={{ top: '100dvh' }}>
          <Footer />
        </div>
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  )
}
