<script lang="ts">
  import earthquakeHistory from '#lib/assets/feature_earthquake_history.webp';
  import eew from '#lib/assets/feature_eew.webp';
  import kyoshinMonitor from '#lib/assets/feature_kyoshin_monitor.webp';
  import notification from '#lib/assets/feature_notification.webp';

  import Container from './Container.svelte';

  const features = [
    {
      title: '緊急地震速報',
      description:
        '緊急地震速報をリアルタイムに表示します。P波・S波の予想到達範囲や予想最大震度、震源を地図上で確認できます。',
      image: eew,
    },
    {
      title: '通知',
      description:
        '緊急地震速報や地震情報を通知でお知らせします。地域ごとに、通知する条件を細かく設定できます。',
      image: notification,
    },
    {
      title: '地震履歴',
      description:
        '過去に発表された地震情報を遡って確認できます。震度データベースにより、1919年以降の地震も調べられます。',
      image: earthquakeHistory,
    },
    {
      title: '強震モニタ',
      description:
        '防災科学技術研究所の強震モニタを表示し、日本全国の揺れの様子をリアルタイムで確認できます。',
      image: kyoshinMonitor,
    },
  ];
</script>

<Container>
  <section aria-labelledby="features-heading" class="pb-12">
    <h2 id="features-heading" class="mb-8 text-center text-3xl font-bold">
      主な機能
    </h2>
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {#each features as feature (feature.title)}
        <article
          class="card flex-row items-start border border-base-300 bg-base-200/50 sm:flex-col sm:items-stretch"
        >
          <figure class="w-2/5 shrink-0 p-3 sm:w-auto sm:px-4 sm:pt-4 sm:pb-0">
            <img
              src={feature.image}
              alt="{feature.title}の画面"
              loading="lazy"
              width="720"
              height="1708"
              class="mx-auto aspect-[3/4] w-full max-w-72 rounded-box object-cover object-top sm:aspect-auto"
            />
          </figure>
          <div class="card-body p-4 pl-1 sm:p-5">
            <h3 class="card-title text-lg">{feature.title}</h3>
            <p class="text-sm leading-relaxed text-base-content/70">
              {feature.description}
            </p>
          </div>
        </article>
      {/each}
    </div>
  </section>
</Container>
