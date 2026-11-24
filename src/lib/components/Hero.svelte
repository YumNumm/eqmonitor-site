<script lang="ts">
  import screenshot1 from '#lib/assets/screenshot_1.png'
  import appicon from '#lib/assets/appicon.webp'
  import appstoreBadge from '#lib/assets/appstore_badge.png'
  import googlePlayBadge from '#lib/assets/google_play_badge.png'
  import Container from './Container.svelte'
  import DownloadIcon from './DownloadIcon.svelte'
  import { APP_STORE_URL, GOOGLE_PLAY_URL } from '#lib/links.ts'
</script>

<Container>
  <div class="grid grid-cols-1 md:grid-cols-3">
    <div class="w-2/3 md:w-auto mx-auto order-last md:order-first p-6 flex items-center">
      <img
        src={screenshot1}
        alt="screenshot 1"
        loading="eager"
        class="w-full drop-shadow-[0_0_25px_rgba(200,200,255,0.1)]"
      />
    </div>
    <div class="p-12 col-span-1 md:col-span-2 flex flex-col justify-center items-center">
      <div class="w-24 h-24 mb-6 relative">
        <img src={appicon} alt="appicon" loading="eager" class="rounded-box blur-md absolute scale-95" />
        <img src={appicon} alt="appicon" loading="eager" class="rounded-box absolute" />
      </div>
      <div class="text-4xl md:text-6xl font-bold mb-8 md:mb-6">EQMonitor</div>
      <div class="text-xl font-mono mb-8 md:mb-6 text-center span-break">
        <span>EQMonitorは、</span><span>日本全国の地震情報を</span><span>いち早く受信できる</span><span
          >アプリケーションです。</span
        >
      </div>
      <div class="flex flex-col md:flex-row justify-center md:w-96">
        <div class="px-2 py-2 md:py-0">
          <div class="text-lg mb-2 flex justify-center md:justify-normal">
            <DownloadIcon class="h-6 w-6 mr-2 font-mono" />
            iPhone / iPad
          </div>
          <a href={APP_STORE_URL} target="_blank" rel="noreferrer">
            <img src={appstoreBadge} alt="appstore badge" loading="eager" class="mx-auto max-h-16 w-auto" />
          </a>
        </div>
        <div class="px-2 py-2 md:py-0">
          <div class="text-lg mb-2 flex justify-center md:justify-normal">
            <DownloadIcon class="h-6 w-6 mr-2 font-mono" />
            Android
          </div>
          <a href={GOOGLE_PLAY_URL} target="_blank" rel="noreferrer">
            <img src={googlePlayBadge} alt="google play badge" loading="eager" class="mx-auto max-h-16 w-auto" />
          </a>
        </div>
      </div>
    </div>
  </div>
</Container>
