<script setup lang="ts">
import '../styles/features.css'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '../stores/theme'
import DatabaseStatus from './DatabaseStatus.vue'
import { goFeatureBack } from '../features/useFeatureTask'
import {onBeforeUnmount,onMounted} from 'vue'

const pageId = `feature-page-${Math.random().toString(36).slice(2)}`
let disposeKeyboard: (()=>void) | undefined
onMounted(()=>{
  // #ifdef H5
  const root=document.getElementById(pageId)
  if(!root)return
  // uni-button 在 H5 是自定义元素；只为新增页面补上原生按钮的焦点和键盘语义。
  const sync=()=>{for(const button of Array.from(root.querySelectorAll<HTMLElement>('uni-button'))){
    const disabled=button.hasAttribute('disabled')||button.classList.contains('uni-button-disabled')
    button.tabIndex=disabled?-1:0
    const value=String(disabled);if(button.getAttribute('aria-disabled')!==value)button.setAttribute('aria-disabled',value)
  }}
  const handleKey=(event:KeyboardEvent)=>{const target=event.target;if(event.defaultPrevented||!(target instanceof HTMLElement)||target.tagName!=='UNI-BUTTON'||target.getAttribute('aria-disabled')==='true')return;if(event.key==='Enter'||event.key===' '){event.preventDefault();target.click()}}
  const observer=new MutationObserver(sync);observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','class']});root.addEventListener('keydown',handleKey);sync()
  disposeKeyboard=()=>{observer.disconnect();root.removeEventListener('keydown',handleKey)}
  // #endif
})
onBeforeUnmount(()=>disposeKeyboard?.())

const props = withDefaults(defineProps<{ title: string; backUrl?: string; loading?: boolean; error?: string; beforeBack?: () => Promise<boolean> }>(), {
  backUrl: '/pages/profile/index', loading: false, error: '',
})
const emit = defineEmits<{ (event: 'retry'): void }>()
const { themeStyle } = storeToRefs(useThemeStore())
async function goBack(): Promise<void> {
  try { await goFeatureBack(props.backUrl, props.beforeBack) }
  catch (cause) { console.error('页面返回失败', cause); uni.showToast({ title: '返回失败，请重试', icon: 'none' }) }
}
</script>

<template>
  <view :id="pageId" class="feature-page" :style="themeStyle">
    <DatabaseStatus />
    <header class="feature-header">
      <button role="button" class="feature-back" aria-label="返回" @click="goBack"><van-icon name="arrow-left" size="23" aria-hidden="true" /></button>
      <h1 class="feature-title">{{ title }}</h1>
      <view class="feature-header-actions"><slot name="actions" /></view>
    </header>
    <scroll-view class="feature-scroll" scroll-y :show-scrollbar="false" :bounces="false" :aria-busy="loading">
      <main class="feature-content">
        <view v-if="error" class="feature-state" role="alert"><h2>暂时无法完成</h2><p>{{ error }}</p><button role="button" class="feature-button" @click="emit('retry')">重试</button></view>
        <view v-else-if="loading" class="feature-state" role="status"><p>正在读取本机数据…</p></view>
        <slot v-else />
      </main>
    </scroll-view>
    <footer v-if="$slots.footer && !loading && !error" class="feature-footer"><slot name="footer" /></footer>
  </view>
</template>

