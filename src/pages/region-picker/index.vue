<script setup lang="ts">
import { computed, ref } from 'vue'
import { chinaRegions, type RegionNode } from '../../regions/chinaRegions'
import type { ProfileLocation, RegionReference } from '../../profile/types'
import { useProfileStore } from '../../stores/profile'

type SelectionStep = 'province' | 'city' | 'district'

const profileStore = useProfileStore()
const currentStep = ref<SelectionStep>('province')
const selectedProvince = ref<RegionNode | null>(null)
const selectedCity = ref<RegionNode | null>(null)
let isSaving = false

const currentItems = computed(() => {
  if (currentStep.value === 'province') return chinaRegions
  if (currentStep.value === 'city') return selectedProvince.value?.children ?? []
  return selectedCity.value?.children ?? selectedProvince.value?.children ?? []
})
const stepTitle = computed(() => ({ province: '选择省份', city: '选择城市', district: '选择区县' })[currentStep.value])

function toReference(region: RegionNode): RegionReference {
  return { code: region.code, name: region.name }
}

function createLocation(city: RegionNode | null, district: RegionNode | null): ProfileLocation | null {
  const province = selectedProvince.value
  if (!province) return null
  const selected = district ?? city ?? province
  return {
    province: toReference(province),
    city: city ? toReference(city) : null,
    district: district ? toReference(district) : null,
    selectedLevel: district ? 'district' : city ? 'city' : 'province',
    adCode: selected.code,
  }
}

async function saveLocation(city: RegionNode | null, district: RegionNode | null) {
  const location = createLocation(city, district)
  if (!location || isSaving) return
  isSaving = true
  try {
    await profileStore.updateProfile({ location })
    uni.showToast({ title: '位置已保存', icon: 'success' })
    uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: '/pages/personal-profile/index' }) })
  } catch (error) {
    console.error('Failed to persist profile location', error)
    uni.showToast({ title: '保存失败，请稍后重试', icon: 'none' })
  } finally {
    isSaving = false
  }
}

function selectRegion(region: RegionNode) {
  if (currentStep.value === 'province') {
    selectedProvince.value = region
    selectedCity.value = null
    if (region.children.length === 0) {
      void saveLocation(null, null)
      return
    }
    currentStep.value = region.children.some((child) => child.children.length > 0) ? 'city' : 'district'
    return
  }
  if (currentStep.value === 'city') {
    if (region.children.length === 0) {
      void saveLocation(region, null)
      return
    }
    selectedCity.value = region
    currentStep.value = 'district'
    return
  }
  void saveLocation(selectedCity.value, region)
}

function goBack() {
  if (currentStep.value === 'district' && selectedCity.value) {
    selectedCity.value = null
    currentStep.value = 'city'
    return
  }
  if (currentStep.value !== 'province') {
    selectedProvince.value = null
    currentStep.value = 'province'
    return
  }
  if (getCurrentPages().length > 1) {
    uni.navigateBack({ delta: 1, fail: goToProfile })
    return
  }
  goToProfile()
}

function goToProfile() {
  uni.reLaunch({ url: '/pages/personal-profile/index' })
}
</script>

<template>
  <div class="region-page">
    <header class="region-nav">
      <div class="back-button" role="button" tabindex="0" aria-label="返回" @click="goBack" @keydown.enter="goBack" @keydown.space.prevent="goBack"><span class="back-glyph" aria-hidden="true">‹</span></div>
      <span aria-hidden="true" /><span aria-hidden="true" />
    </header>
    <section class="selection-summary">
      <span class="summary-label">当前选择</span>
      <div class="breadcrumb-row">
        <span v-if="selectedProvince" class="breadcrumb-value">{{ selectedProvince.name }}</span>
        <span v-if="selectedProvince && selectedCity" class="breadcrumb-arrow" aria-hidden="true">›</span>
        <span v-if="selectedCity" class="breadcrumb-value">{{ selectedCity.name }}</span>
        <span class="breadcrumb-prompt">{{ stepTitle }}</span>
      </div>
    </section>
    <main class="region-list" :aria-label="stepTitle">
      <div v-for="region in currentItems" :key="region.code" class="region-row" role="button" tabindex="0" :aria-label="`${region.children.length ? '选择' : '确定'}${region.name}`" @click="selectRegion(region)" @keydown.enter="selectRegion(region)" @keydown.space.prevent="selectRegion(region)">
        <span class="region-name">{{ region.name }}</span>
        <span class="region-action" aria-hidden="true">{{ region.children.length ? '›' : '✓' }}</span>
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
.region-page { width: min(100%, 560px); min-height: 100vh; min-height: 100dvh; margin: 0 auto; background: var(--color-surface-muted); color: var(--color-text); }
.region-nav { position: sticky; z-index: 3; top: 0; height: calc(58px + var(--app-top-safe-area)); padding: var(--app-top-safe-area) 12px 0; display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.back-button { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%; color: var(--color-text); }
.back-glyph { margin-top: -3px; font-size: 36px; font-weight: 300; line-height: 1; }
.back-button:active { background: var(--color-primary-soft); }
.selection-summary { position: sticky; z-index: 2; top: calc(58px + var(--app-top-safe-area)); padding: 12px 20px; border-bottom: 1px solid var(--color-border); background: var(--color-surface); box-shadow: 0 4px 12px var(--color-shadow); }
.summary-label { display: block; color: var(--color-text-muted); font-size: 8px; }
.breadcrumb-row { min-height: 24px; margin-top: 4px; display: flex; align-items: center; gap: 7px; color: var(--color-text-muted); font-size: 11px; }
.breadcrumb-value { color: var(--color-text); font-weight: 600; }
.breadcrumb-arrow { font-size: 18px; line-height: 1; }
.breadcrumb-prompt { color: var(--color-primary); }
.region-list { padding: 8px 16px calc(20px + env(safe-area-inset-bottom)); }
.region-row { min-height: 52px; padding: 0 6px 0 12px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text-muted); }
.region-row:first-child { border-radius: 12px 12px 0 0; }
.region-row:last-child { border-bottom: 0; border-radius: 0 0 12px 12px; }
.region-row:only-child { border-radius: 12px; }
.region-row:active { background: var(--color-primary-soft); color: var(--color-primary); }
.region-name { min-width: 0; flex: 1; color: var(--color-text); font-size: 12px; }
.region-action { flex: none; color: var(--color-text-muted); font-size: 22px; line-height: 1; }
.back-button:focus-visible, .region-row:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
</style>
