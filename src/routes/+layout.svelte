<script lang="ts">
  import '../app.css'
  import type { Snippet } from 'svelte'
  import Navbar from '#lib/components/Navbar.svelte'
  import Footer from '#lib/components/Footer.svelte'

  let { children }: { children: Snippet } = $props()
</script>

<svelte:head>
  <meta name="og:image" content="/assets/header.png" />
</svelte:head>

<Navbar />
{@render children()}
<div class="sticky" style="top: 100dvh">
  <Footer />
</div>
