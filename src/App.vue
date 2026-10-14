<template>
  <view class="app-shell" :data-theme="currentThemeId"><slot /></view>
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
page { background: var(--color-page); }

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
</style>
