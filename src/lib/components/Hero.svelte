<script lang="ts">
  import appicon from '#lib/assets/appicon.webp';
  import appstoreBadge from '#lib/assets/appstore_badge.png';
  import googlePlayBadge from '#lib/assets/google_play_badge.png';
  import heroIphone from '#lib/assets/hero_iphone.webp';
  import { APP_STORE_URL, GOOGLE_PLAY_URL } from '#lib/links.ts';

  import Container from './Container.svelte';
  import DownloadIcon from './DownloadIcon.svelte';
</script>

<Container>
  <div class="grid grid-cols-1 md:grid-cols-3">
    <div
      class="order-last mx-auto flex w-2/3 items-center p-6 md:order-first md:w-auto"
    >
      <img
        src={heroIphone}
        alt="EQMonitor の緊急地震速報の画面"
        width="640"
        height="1317"
        loading="eager"
        class="w-full drop-shadow-[0_0_25px_rgba(200,200,255,0.1)]"
      />
    </div>
    <div
      class="col-span-1 flex flex-col items-center justify-center p-12 md:col-span-2"
    >
      <div class="relative mb-6 h-24 w-24">
        <img
          src={appicon}
          alt="appicon"
          loading="eager"
          class="absolute scale-95 rounded-box blur-md"
        />
        <img
          src={appicon}
          alt="appicon"
          loading="eager"
          class="absolute rounded-box"
        />
      </div>
      <div class="mb-8 text-4xl font-bold md:mb-6 md:text-6xl">EQMonitor</div>
      <div class="span-break mb-8 text-center font-mono text-xl md:mb-6">
        <span>EQMonitorは、</span><span>日本全国の地震情報を</span><span
          >いち早く受信できる</span
        ><span>アプリケーションです。</span>
      </div>
      <div class="flex flex-col justify-center md:w-96 md:flex-row">
        <div class="px-2 py-2 md:py-0">
          <div class="mb-2 flex justify-center text-lg md:justify-normal">
            <DownloadIcon class="mr-2 h-6 w-6 font-mono" />
            iPhone / iPad
          </div>
          <a href={APP_STORE_URL} target="_blank" rel="noreferrer">
            <img
              src={appstoreBadge}
              alt="appstore badge"
              loading="eager"
              class="mx-auto max-h-16 w-auto"
            />
          </a>
        </div>
        <div class="px-2 py-2 md:py-0">
          <div class="mb-2 flex justify-center text-lg md:justify-normal">
            <DownloadIcon class="mr-2 h-6 w-6 font-mono" />
            Android
          </div>
          <a href={GOOGLE_PLAY_URL} target="_blank" rel="noreferrer">
            <img
              src={googlePlayBadge}
              alt="google play badge"
              loading="eager"
              class="mx-auto max-h-16 w-auto"
            />
          </a>
        </div>
      </div>
    </div>
  </div>
</Container>
