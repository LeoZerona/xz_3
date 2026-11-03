<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBackPress } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import DatabaseStatus from '../../components/DatabaseStatus.vue'
import CharacterSearchButton from '../../components/CharacterSearchButton.vue'
import CharacterComparisonMatrix from './components/CharacterComparisonMatrix.vue'
import { applicationReady } from '../../database/application'
import { findCharactersByText } from '../../database/catalog'
import { useThemeStore } from '../../stores/theme'
import { useFontStore } from '../../stores/fonts'
import { useCharacterComparisonStore } from '../../stores/characterComparison'
import { comparisonAdditionMessage, MAX_COMPARISON_CHARACTERS, parseCharacterInput } from '../../comparison/characterComparison'
import type { CharacterEntry } from '../../search/characterSearch'

const { themeStyle } = storeToRefs(useThemeStore())
const { currentFont, referenceFont } = storeToRefs(useFontStore())
const comparisonStore = useCharacterComparisonStore()
const { characters } = storeToRefs(comparisonStore)
const inputText = ref('')
const feedback = ref('')
const isAdding = ref(false)
const examples = ['己 已 巳', '未 末', '土 士', '日 曰']
let addRequest = 0

async function handleAdd(value = inputText.value): Promise<void> {
  if (!applicationReady.value || isAdding.value) return
  const texts = parseCharacterInput(value)
  if (!texts) { feedback.value = '请输入汉字，可用空格或逗号分隔。'; return }
  const request = ++addRequest
  isAdding.value = true
  feedback.value = ''
  try {
    const result = await findCharactersByText(texts)
    if (request !== addRequest) return
    const added = comparisonStore.addCharacters(result.entries)
    feedback.value = comparisonAdditionMessage(added, result.missing)
    if (added.saved && added.addedCount && !added.overflowCount && !result.missing.length) inputText.value = ''
  } catch (error) {
    if (request === addRequest) feedback.value = error instanceof Error ? error.message : '文字加载失败，请重试'
  } finally { if (request === addRequest) isAdding.value = false }
}
function handleRemove(id: string): void {
  if (isAdding.value) return
  feedback.value = comparisonStore.removeCharacter(id) ? '' : '移除失败，请重试'
}
function handleClear(): void {
  if (isAdding.value) return
  feedback.value = comparisonStore.clearCharacters() ? '已清空比较列表' : '清空失败，请重试'
}
function handleOpenCharacter(entry: CharacterEntry): void {
  uni.navigateTo({ url: '/pages/character-detail/index?id=' + encodeURIComponent(entry.id), fail: () => uni.showToast({ title: '暂时无法打开文字详情', icon: 'none' }) })
}
function goHome(): void { uni.reLaunch({ url: '/pages/index/index' }) }
function goBack(): void {
  if (getCurrentPages().length > 1) uni.navigateBack({ delta: 1, fail: goHome })
  else goHome()
}
onBackPress((event) => {
  if (event.from === 'navigateBack') return false
  goBack()
  return true
})
onBeforeUnmount(() => { addRequest++ })
onMounted(async () => {
  // #ifdef H5
  await nextTick()
  const input = document.querySelector<HTMLInputElement>('.character-compare-page .comparison-input input')
  input?.setAttribute('aria-label', '添加要比较的汉字')
  input?.setAttribute('aria-describedby', 'comparison-input-note')
  // #endif
})
</script>

<template>
  <view class="character-compare-page" :style="themeStyle">
    <DatabaseStatus />
    <view class="compare-nav">
      <button class="compare-back" role="button" tabindex="0" aria-label="返回" @click="goBack" @keydown.enter.prevent="goBack" @keydown.space.prevent="goBack"><van-icon name="arrow-left" size="22" aria-hidden="true" /></button>
      <h1>字形比较</h1>
      <CharacterSearchButton />
    </view>
    <view class="compare-content">
      <p class="compare-intro">用相同字体并排看形近字，分清每一笔。</p>
      <label class="compare-input-label" for="comparison-input">添加要比较的汉字</label>
      <view class="compare-input-row">
        <input id="comparison-input" v-model="inputText" class="comparison-input" type="text" confirm-type="done" :maxlength="60" :disabled="isAdding || !applicationReady" placeholder="如 己已巳，或 未 末" aria-label="添加要比较的汉字" aria-describedby="comparison-input-note" @confirm="handleAdd()" />
        <button class="compare-add" role="button" :tabindex="isAdding || !applicationReady ? -1 : 0" aria-label="添加到比较" :disabled="isAdding || !applicationReady" @click="handleAdd()" @keydown.enter.prevent="handleAdd()" @keydown.space.prevent="handleAdd()">{{ isAdding ? '添加中…' : '添加' }}</button>
      </view>
      <text id="comparison-input-note" class="compare-input-note">最多 {{ MAX_COMPARISON_CHARACTERS }} 个字，支持连续输入或用空格、逗号分隔。</text>
      <text v-if="feedback" class="compare-feedback" role="status">{{ feedback }}</text>
      <view v-if="!characters.length" class="compare-examples" aria-label="常见形近字组">
        <button v-for="example in examples" :key="example" class="compare-example" role="button" :tabindex="isAdding || !applicationReady ? -1 : 0" :aria-label="'加入形近字组' + example" :disabled="isAdding || !applicationReady" @click="handleAdd(example)" @keydown.enter.prevent="handleAdd(example)" @keydown.space.prevent="handleAdd(example)">{{ example }}</button>
      </view>
      <view class="compare-selection-heading"><text>已选 {{ characters.length }} / {{ MAX_COMPARISON_CHARACTERS }}</text><button v-if="characters.length" class="compare-clear" role="button" :tabindex="isAdding ? -1 : 0" aria-label="清空比较列表" :disabled="isAdding" @click="handleClear" @keydown.enter.prevent="handleClear" @keydown.space.prevent="handleClear">清空</button></view>
      <view v-if="characters.length" class="compare-selection">
        <button v-for="entry in characters" :key="entry.id" class="compare-selected-character" role="button" :tabindex="isAdding ? -1 : 0" :aria-label="'移除比较文字' + entry.script_forms.simplified" :disabled="isAdding" @click="handleRemove(entry.id)" @keydown.enter.prevent="handleRemove(entry.id)" @keydown.space.prevent="handleRemove(entry.id)">{{ entry.script_forms.simplified }}<van-icon name="cross" size="13" aria-hidden="true" /></button>
      </view>
      <p v-if="characters.length === 1" class="compare-hint">再添加一个字，就能放在一起比较。</p>
      <CharacterComparisonMatrix v-if="characters.length" :characters="characters" :learning-font="currentFont" :reference-font="referenceFont" @character-open="handleOpenCharacter" />
      <view v-else class="compare-empty"><text class="compare-empty-glyphs" aria-hidden="true">未　末</text><h2>把容易混淆的字放在一起</h2><p>添加文字后，可以比较学习字体、对照字体、读音、笔画与释义。列表会自动保存。</p></view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.character-compare-page { width: min(100%, 1000px); min-height: 100vh; min-height: 100dvh; margin: 0 auto; background: var(--color-page); color: var(--color-text); font-variant-numeric: tabular-nums; }
.compare-nav { position: sticky; z-index: 2; top: 0; display: flex; align-items: center; gap: 10px; min-height: calc(58px + var(--app-top-safe-area)); padding: var(--app-top-safe-area) 12px 0; background: var(--color-page); }
.compare-nav h1 { flex: 1; margin: 0; font-size: 22px; font-weight: 650; }
.compare-back { display: grid; place-items: center; width: 44px; min-height: 44px; margin: 0; padding: 0; border-radius: 50%; color: var(--color-text); background: transparent; }
.compare-content { padding: 18px 16px calc(30px + env(safe-area-inset-bottom)); }
.compare-intro { margin: 0 0 22px; color: var(--color-text-secondary); font-size: 14px; line-height: 1.6; }
.compare-input-label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; }
.compare-input-row { display: flex; align-items: center; gap: 8px; }
.comparison-input { flex: 1; min-width: 0; height: 46px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface-muted); color: var(--color-text); font-size: 15px; }
.compare-add { flex: none; display: grid; place-items: center; min-width: 64px; min-height: 46px; margin: 0; padding: 0 14px; border-radius: 12px; background: var(--color-primary-strong); color: var(--color-on-primary); font-size: 14px; }
.compare-input-note { display: block; margin-top: 9px; color: var(--color-text-secondary); font-size: 12px; line-height: 1.6; }
.compare-feedback { display: block; margin-top: 12px; color: var(--color-text); font-size: 13px; line-height: 1.6; }
.compare-examples { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
.compare-example { display: grid; place-items: center; min-height: 44px; margin: 0; padding: 0 12px; border-radius: 12px; background: var(--color-surface-muted); color: var(--color-text); font-size: 14px; }
.compare-selection-heading { display: flex; align-items: center; justify-content: space-between; min-height: 44px; margin-top: 20px; color: var(--color-text-secondary); font-size: 13px; }
.compare-clear { display: grid; place-items: center; min-width: 44px; min-height: 44px; margin: 0; padding: 0 6px; border-radius: 0; background: transparent; color: var(--color-primary-strong); font-size: 13px; }
.compare-selection { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 16px; }
.compare-selected-character { display: flex; align-items: center; gap: 12px; min-width: 52px; min-height: 44px; margin: 0; padding: 0 12px; border-radius: 12px; background: var(--color-primary-soft); color: var(--color-text); font-size: 21px; }
.compare-hint { margin: 0 0 14px; color: var(--color-text-secondary); font-size: 13px; }
.compare-empty { padding: 38px 14px; border-radius: 18px; background: var(--color-surface-muted); text-align: center; }
.compare-empty-glyphs { display: block; margin-bottom: 20px; color: var(--color-text); font-size: 56px; line-height: 1.2; }
.compare-empty h2 { margin: 0 0 10px; font-size: 17px; font-weight: 600; }
.compare-empty p { max-width: 26em; margin: 0 auto; color: var(--color-text-secondary); font-size: 13px; line-height: 1.7; }
button[disabled] { opacity: .5; }
button:focus-visible, .comparison-input:focus-within { outline: 2px solid var(--color-primary); outline-offset: 2px; }
@media (min-width: 901px) { .compare-content { padding-right: 32px; padding-left: 32px; } .compare-input-row { max-width: 560px; } }
</style>
