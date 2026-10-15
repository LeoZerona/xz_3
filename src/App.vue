<template>
  <view class="app-shell" :data-theme="currentThemeId">
    <view class="app-safe-mask" aria-hidden="true" />
    <slot />
  </view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useThemeStore } from './stores/theme'

const themeStore = useThemeStore()
const { currentThemeId } = storeToRefs(themeStore)

onMounted(themeStore.initialize)
</script>

<style>
page { background: var(--color-page); overscroll-behavior: none; overscroll-behavior-y: none; }

/* 修复 uni.showToast 在 H5 上图标与文字不居中的问题：原样式图标无水平居中，内容宽度与空白处理导致偏左 */
uni-toast.uni-toast,
.uni-toast {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
}
uni-toast .uni-toast__icon,
.uni-toast .uni-toast__icon,
uni-toast .uni-icon_toast,
.uni-toast .uni-icon_toast {
  margin: 18px auto 0 !important;
  display: block !important;
}
uni-toast .uni-toast__content,
.uni-toast .uni-toast__content {
  width: 90% !important;
  margin: 10px auto 16px !important;
  text-align: center !important;
  white-space: normal !important;
  word-break: break-word !important;
  overflow: visible !important;
}

/* 全局页面切换不闪烁：H5 下 uni 页面为 vue-router 视图，增加淡入衔接 */
uni-page, .uni-page {
  background: var(--color-page);
}

@media (prefers-reduced-motion: reduce) {
  * { scroll-behavior: auto !important; }
}
</style>
