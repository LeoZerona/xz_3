import { onBeforeUnmount, ref } from 'vue'
import { onBackPress, onShow } from '@dcloudio/uni-app'
import { applicationReady } from '../database/application'
import { useDatabaseTask } from '../database/useDatabaseTask'

export function useFeatureTask(load: () => Promise<void>, options: { refreshOnShow?: boolean; backUrl?: string; beforeBack?: () => Promise<boolean> } = {}) {
  const loading = ref(true)
  const error = ref('')
  let loaded = false
  let active = true
  let pending: Promise<void> | undefined
  let requestedAgain = false
  function reload(): Promise<void> {
    if (!applicationReady.value || !active) return Promise.resolve()
    if (pending) { requestedAgain = true; return pending }
    loading.value = true
    pending = (async () => {
      do {
        requestedAgain = false
        try { await load(); if (active) { error.value = ''; loaded = true } }
        catch (cause) { if (active) error.value = cause instanceof Error ? cause.message : '本机数据读取失败，请重试' }
      } while (requestedAgain && active)
    })().finally(() => { pending = undefined; if (active) loading.value = false })
    return pending
  }
  useDatabaseTask(reload)
  onShow(() => { if (loaded && options.refreshOnShow !== false) void reload() })
  // 页面生命周期注册在页面 setup，而非子组件，确保 App 系统返回键也受保护。
  onBackPress((event) => {
    if (event.from === 'navigateBack') return false
    void goFeatureBack(options.backUrl, options.beforeBack).catch((cause: unknown) => {
      console.error('页面返回失败', cause)
      uni.showToast({ title: '返回失败，请重试', icon: 'none' })
    })
    return true
  })
  onBeforeUnmount(() => { active = false })
  return { loading, error, reload }
}

export function useFeatureAction() {
  const busy = ref(false)
  const actionError = ref('')
  async function perform(action: () => Promise<void>): Promise<void> {
    if (busy.value) return
    busy.value = true
    actionError.value = ''
    try { await action() }
    catch (cause) { actionError.value = cause instanceof Error ? cause.message : '操作未完成，请重试' }
    finally { busy.value = false }
  }
  return { busy, actionError, perform }
}

export function openFeature(url: string, replace = false): Promise<void> {
  return new Promise((resolve, reject) => {
    const options = { url, success: () => resolve(), fail: () => reject(new Error('页面打开失败，请重试')) }
    if (replace) uni.redirectTo(options)
    else uni.navigateTo(options)
  })
}

/** 编辑页保存后复用上一层详情，避免反复保存堆积相同页面。 */
export async function finishFeatureEdit(url: string): Promise<void> {
  const pages = getCurrentPages()
  const previous = pages[pages.length - 2]
  const targetRoute = url.split('?')[0]!.replace(/^\//, '')
  if (previous?.route === targetRoute) {
    await new Promise<void>((resolve, reject) => uni.navigateBack({ success: () => resolve(), fail: () => reject(new Error('返回详情失败，请重试')) }))
  } else await openFeature(url, true)
}

export function confirmFeature(title: string, content: string, confirmText = '确认'): Promise<boolean> {
  return new Promise((resolve) => uni.showModal({ title, content, confirmText,
    success: (result) => resolve(result.confirm), fail: () => resolve(false) }))
}

export async function goFeatureBack(backUrl = '/pages/profile/index', beforeBack?: () => Promise<boolean>): Promise<void> {
  if (beforeBack && !await beforeBack()) return
  await new Promise<void>((resolve, reject) => {
    const fallback = () => uni.reLaunch({ url: backUrl, success: () => resolve(), fail: () => reject(new Error('返回页面失败')) })
    if (getCurrentPages().length > 1) uni.navigateBack({ success: () => resolve(), fail: fallback })
    else fallback()
  })
}
