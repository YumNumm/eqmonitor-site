import { ArrowDownTrayIcon } from '@heroicons/react/24/solid'
import { Container } from '~/components/Container'
import screenshot1 from '~/assets/screenshot_1.png'
import appicon from '~/assets/appicon.webp'
import appstoreBadge from '~/assets/appstore_badge.png'
import googlePlayBadge from '~/assets/google_play_badge.png'

export function Hero() {
  return (
    <Container>
      <div className="grid grid-cols-1 md:grid-cols-3">
        <div className="w-2/3 md:w-auto mx-auto order-last md:order-first p-6 flex items-center">
          <img
            src={screenshot1}
            alt="screenshot 1"
            loading="eager"
            className="w-full drop-shadow-[0_0_25px_rgba(200,200,255,0.1)]"
          />
        </div>
        <div className="p-12 col-span-1 md:col-span-2 flex flex-col justify-center items-center">
          <div className="w-24 h-24 mb-6 relative">
            <img
              src={appicon}
              alt="appicon"
              loading="eager"
              className="rounded-box blur-md absolute scale-95"
            />
            <img
              src={appicon}
              alt="appicon"
              loading="eager"
              className="rounded-box absolute"
            />
          </div>
          <div className="text-4xl md:text-6xl font-bold mb-8 md:mb-6">
            EQMonitor
          </div>
          <div className="text-xl font-mono mb-8 md:mb-6 text-center span-break">
            <span>EQMonitorは、</span>
            <span>日本全国の地震情報を</span>
            <span>いち早く受信できる</span>
            <span>アプリケーションです。</span>
          </div>
          <div className="flex flex-col md:flex-row justify-center md:w-96">
            <div className="px-2 py-2 md:py-0">
              <div className="text-lg mb-2 flex justify-center md:justify-normal">
                <ArrowDownTrayIcon className="h-6 w-6 mr-2 font-mono" />
                iPhone / iPad
              </div>
              <a
                href="https://apps.apple.com/us/app/eqmonitor-%E5%9C%B0%E9%9C%87%E9%80%9F%E5%A0%B1/id6447546703"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={appstoreBadge}
                  alt="appstore badge"
                  loading="eager"
                  className="mx-auto max-h-16 w-auto"
                />
              </a>
            </div>
            <div className="px-2 py-2 md:py-0">
              <div className="text-lg mb-2 flex justify-center md:justify-normal">
                <ArrowDownTrayIcon className="h-6 w-6 mr-2 font-mono" />
                Android
              </div>
              <a
                href="https://play.google.com/store/apps/details?id=net.yumnumm.eqmonitor"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={googlePlayBadge}
                  alt="google play badge"
                  loading="eager"
                  className="mx-auto max-h-16 w-auto"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}
