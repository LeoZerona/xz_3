<script setup lang="ts">
function handleOpenSearch(): void {
  const pages = getCurrentPages()
  const existing = pages.findIndex((page) => page.route === 'pages/search/index')
  const fail = () => uni.showToast({ title: '暂时无法打开文字搜索，请重试', icon: 'none' })
  if (existing >= 0) {
    const delta = pages.length - 1 - existing
    if (delta > 0) uni.navigateBack({ delta, fail })
  } else uni.navigateTo({ url: '/pages/search/index', fail })
}
</script>

<template>
  <button class="character-search-button" role="button" tabindex="0" aria-label="搜索" title="搜索文字" @click.stop="handleOpenSearch" @keydown.enter.stop.prevent="handleOpenSearch" @keydown.space.stop.prevent="handleOpenSearch" @keyup.space.stop.prevent>
    <van-icon name="search" size="23" aria-hidden="true" />
  </button>
</template>

<style scoped lang="scss">
.character-search-button { display: grid; place-items: center; flex: none; width: 44px; min-width: 44px; height: 44px; min-height: 44px; margin: 0; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--color-text); line-height: 1; }
.character-search-button::after { border: 0; }
.character-search-button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
.character-search-button:active { background: var(--color-primary-soft); }
</style>
