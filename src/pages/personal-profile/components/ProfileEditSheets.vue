<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { GENDER_OPTIONS, type Gender, type UserProfilePatch } from '../../../profile/types'
import { useProfileStore } from '../../../stores/profile'

type EditSheet = 'nickname' | 'gender' | 'birth'

type BirthPart = 'year' | 'month' | 'day'

const profileStore = useProfileStore()
const activeSheet = ref<EditSheet | null>(null)
const nicknameInitialValue = ref('')
const selectedGender = ref<Gender>('保密')

const today = new Date()
const currentYear = today.getFullYear()
const currentMonth = today.getMonth() + 1
const currentDay = today.getDate()
const years = Array.from({ length: currentYear - 1899 }, (_, index) => 1900 + index)
const months = Array.from({ length: 12 }, (_, index) => index + 1)
const days = Array.from({ length: 31 }, (_, index) => index + 1)
const BIRTH_WHEEL_ITEM_HEIGHT = 44

// uni-h5 的原生表单/滚轮组件更新其内部 slot 时，不适合由父层同步重渲染。
// 编辑中的值只在事件中缓存，保存时一次性写入响应式 store。
let isSaving = false
let hasUserAdjustedBirth = false
let nicknameDraftValue = ''
let birthIndexesValue = [100, 0, 0]
let wheelScrollTimer: ReturnType<typeof setTimeout> | null = null

let previousBodyOverflow = ''

watch(activeSheet, (sheet) => {
  if (typeof document === 'undefined') return
  if (sheet) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = previousBodyOverflow
  }
})

onBeforeUnmount(() => {
  if (wheelScrollTimer) clearTimeout(wheelScrollTimer)
  if (typeof document !== 'undefined') document.body.style.overflow = previousBodyOverflow
})

async function persistProfile(patch: UserProfilePatch) {
  if (isSaving) return false
  const previousSheet = activeSheet.value
  isSaving = true
  activeSheet.value = null
  try {
    await profileStore.updateProfile(patch)
    uni.showToast({ title: '已保存', icon: 'success' })
    return true
  } catch (error) {
    console.error('Failed to persist user profile', error)
    uni.showToast({ title: '保存失败，请稍后重试', icon: 'none' })
    activeSheet.value = previousSheet
    return false
  } finally {
    isSaving = false
  }
}

function closeSheet() {
  if (!isSaving) activeSheet.value = null
}

function openNickname() {
  nicknameDraftValue = profileStore.profile.nickname
  nicknameInitialValue.value = nicknameDraftValue
  activeSheet.value = 'nickname'
}

function handleNicknameInput(event: Event) {
  const target = event.currentTarget
  if (target instanceof HTMLElement) nicknameDraftValue = target.textContent ?? ''
}

async function saveNickname() {
  // H5 读取原生可编辑文本；事件缓存供其他平台或无 DOM 环境回退。
  const field = typeof document === 'undefined' ? null : document.getElementById('nickname-input')
  const nativeValue = field?.textContent ?? undefined
  const nickname = (nativeValue ?? nicknameDraftValue).trim()
  if (!nickname) {
    uni.showToast({ title: '昵称不能为空', icon: 'none' })
    return
  }
  if (nickname.length > 24) {
    uni.showToast({ title: '昵称最多 24 个字符', icon: 'none' })
    return
  }
  if (nickname === profileStore.profile.nickname) {
    closeSheet()
    return
  }
  await persistProfile({ nickname })
}

function openGender() {
  selectedGender.value = profileStore.profile.gender
  activeSheet.value = 'gender'
}

async function saveGender(gender: Gender) {
  if (gender === profileStore.profile.gender) {
    closeSheet()
    return
  }
  await persistProfile({ gender })
}

function openBirth() {
  const [year = 2000, month = 1, day = 1] = (profileStore.profile.birthDate ?? '2000-01-01').split('-').map(Number)
  birthIndexesValue = [
    Math.max(0, years.indexOf(year)),
    Math.max(0, months.indexOf(month)),
    Math.max(0, day - 1),
  ]
  hasUserAdjustedBirth = false
  activeSheet.value = 'birth'
  void nextTick(scrollBirthWheels)
}

function getBirthPartPosition(part: BirthPart) {
  return part === 'year' ? 0 : part === 'month' ? 1 : 2
}

function scrollBirthWheels() {
  if (typeof document === 'undefined') return
  const initialIndexes = [...birthIndexesValue]
  document.querySelectorAll<HTMLElement>('.wheel-column[data-part]').forEach((column) => {
    const part = column.dataset.part as BirthPart | undefined
    if (!part) return
    column.scrollTop = (initialIndexes[getBirthPartPosition(part)] ?? 0) * BIRTH_WHEEL_ITEM_HEIGHT
  })
}

function handleWheelScroll(part: BirthPart, event: Event) {
  if (!hasUserAdjustedBirth) return
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return
  const itemCount = part === 'year' ? years.length : part === 'month' ? months.length : days.length
  const index = Math.min(itemCount - 1, Math.max(0, Math.round(target.scrollTop / BIRTH_WHEEL_ITEM_HEIGHT)))
  if (wheelScrollTimer) clearTimeout(wheelScrollTimer)
  wheelScrollTimer = setTimeout(() => {
    birthIndexesValue[getBirthPartPosition(part)] = index
    wheelScrollTimer = null
  }, 80)
}

function handleWheelOption(part: BirthPart, index: number, event: Event) {
  hasUserAdjustedBirth = true
  if (wheelScrollTimer) {
    clearTimeout(wheelScrollTimer)
    wheelScrollTimer = null
  }
  birthIndexesValue[getBirthPartPosition(part)] = index
  const option = event.currentTarget
  if (option instanceof HTMLElement) option.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

function handleWheelStart() {
  hasUserAdjustedBirth = true
}

async function saveBirth() {
  const [yearIndex = 0, monthIndex = 0, dayIndex = 0] = birthIndexesValue
  const year = years[yearIndex] ?? 2000
  const selectedMonth = months[monthIndex] ?? 1
  const month = year === currentYear ? Math.min(selectedMonth, currentMonth) : selectedMonth
  const maxDay = year === currentYear && month === currentMonth
    ? currentDay
    : new Date(year, month, 0).getDate()
  const day = Math.min(days[dayIndex] ?? 1, maxDay)
  const birthDate = [year, month, day]
    .map((value) => String(value).padStart(2, '0'))
    .join('-')
  if (birthDate === profileStore.profile.birthDate) {
    closeSheet()
    return
  }
  await persistProfile({ birthDate })
}

defineExpose({ openNickname, openGender, openBirth })
</script>

<template>
  <div v-if="activeSheet" class="sheet-overlay" role="presentation" @click.self="closeSheet">
    <div class="bottom-sheet" role="dialog" aria-modal="true" :aria-label="activeSheet === 'nickname' ? '修改昵称' : activeSheet === 'gender' ? '选择性别' : '选择出生日期'">
      <template v-if="activeSheet === 'nickname'">
        <div class="sheet-toolbar">
          <div class="toolbar-action" role="button" tabindex="0" @click="closeSheet" @keydown.enter="closeSheet" @keydown.space.prevent="closeSheet">取消</div>
          <span class="sheet-title">修改昵称</span>
          <div class="toolbar-action is-confirm" role="button" tabindex="0" aria-label="保存昵称" @click="saveNickname" @keydown.enter="saveNickname" @keydown.space.prevent="saveNickname">保存</div>
        </div>
        <div class="nickname-field">
          <label class="field-label" for="nickname-input">昵称</label>
          <div id="nickname-input" class="field-input" role="textbox" aria-label="昵称" contenteditable="true" spellcheck="false" @input="handleNicknameInput" @keydown.enter.prevent="saveNickname">{{ nicknameInitialValue }}</div>
        </div>
        <span class="editor-hint">使用容易识别的昵称，最多 24 个字符。</span>
      </template>

      <template v-else-if="activeSheet === 'gender'">
        <div class="sheet-toolbar"><div class="toolbar-action" role="button" tabindex="0" @click="closeSheet" @keydown.enter="closeSheet" @keydown.space.prevent="closeSheet">取消</div><span class="sheet-title">选择性别</span><span /></div>
        <div class="gender-options" role="radiogroup" aria-label="性别">
          <div v-for="gender in GENDER_OPTIONS" :key="gender" class="gender-option" role="radio" tabindex="0" :aria-checked="selectedGender === gender" :aria-label="gender" @click="saveGender(gender)" @keydown.enter="saveGender(gender)" @keydown.space.prevent="saveGender(gender)">
            <span>{{ gender }}</span><span v-if="selectedGender === gender" class="selected-mark" aria-hidden="true">✓</span>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="sheet-toolbar">
          <div class="toolbar-action" role="button" tabindex="0" @click="closeSheet" @keydown.enter="closeSheet" @keydown.space.prevent="closeSheet">取消</div>
          <span class="sheet-title">选择出生日期</span>
          <div class="toolbar-action is-confirm" role="button" tabindex="0" aria-label="确认出生日期" @click="saveBirth" @keydown.enter="saveBirth" @keydown.space.prevent="saveBirth">确认</div>
        </div>
        <div class="date-picker" role="group" aria-label="出生日期滚轮">
          <div class="wheel-column" role="listbox" aria-label="年" data-part="year" @pointerdown="handleWheelStart" @touchstart.passive="handleWheelStart" @wheel.passive="handleWheelStart" @scroll.passive="handleWheelScroll('year', $event)">
            <div v-for="(year, index) in years" :key="year" class="picker-option" role="option" :aria-label="`${year}年`" @click="handleWheelOption('year', index, $event)">{{ year }}年</div>
          </div>
          <div class="wheel-column" role="listbox" aria-label="月" data-part="month" @pointerdown="handleWheelStart" @touchstart.passive="handleWheelStart" @wheel.passive="handleWheelStart" @scroll.passive="handleWheelScroll('month', $event)">
            <div v-for="(month, index) in months" :key="month" class="picker-option" role="option" :aria-label="`${month}月`" @click="handleWheelOption('month', index, $event)">{{ month }}月</div>
          </div>
          <div class="wheel-column" role="listbox" aria-label="日" data-part="day" @pointerdown="handleWheelStart" @touchstart.passive="handleWheelStart" @wheel.passive="handleWheelStart" @scroll.passive="handleWheelScroll('day', $event)">
            <div v-for="(day, index) in days" :key="day" class="picker-option" role="option" :aria-label="`${day}日`" @click="handleWheelOption('day', index, $event)">{{ day }}日</div>
          </div>
          <div class="wheel-indicator" aria-hidden="true" />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.sheet-overlay { position: fixed; z-index: 100; inset: 0; display: flex; align-items: flex-end; justify-content: center; background: #0007; }
.bottom-sheet { width: min(100%, 560px); overflow: hidden; border-radius: 18px 18px 0 0; background: var(--color-surface); color: var(--color-text); box-shadow: 0 -8px 30px var(--color-shadow); padding-bottom: env(safe-area-inset-bottom); }
.sheet-toolbar { height: 54px; padding: 0 6px; display: grid; grid-template-columns: 72px 1fr 72px; align-items: center; border-bottom: 1px solid var(--color-border); }
.sheet-title { font-size: 15px; font-weight: 700; text-align: center; }
.toolbar-action { min-width: 0; padding: 12px; border: 0; background: transparent; color: var(--color-text-secondary); font: inherit; font-size: 13px; text-align: center; }
.toolbar-action.is-confirm { color: var(--color-primary); font-weight: 600; }
.nickname-field { min-height: 52px; margin: 14px 16px 0; padding: 0 12px; display: flex; align-items: center; gap: 12px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-surface-muted); }
.nickname-field:focus-within { border-color: var(--color-primary); box-shadow: 0 0 0 2px var(--color-primary-soft); }
.field-label { flex: none; font-size: 13px; }
.field-input { min-width: 0; min-height: 24px; flex: 1; overflow: hidden; color: var(--color-text); font-size: 14px; line-height: 24px; outline: 0; white-space: nowrap; }
.editor-hint { display: block; min-height: 66px; padding: 8px 16px 18px; color: var(--color-text-muted); font-size: 10px; }
.gender-options { padding: 4px 20px 16px; }
.gender-option { width: 100%; min-height: 54px; padding: 0; display: flex; align-items: center; justify-content: space-between; border: 0; border-bottom: 1px solid var(--color-border); background: transparent; color: var(--color-text); font: inherit; font-size: 15px; text-align: left; }
.gender-option:last-child { border-bottom: 0; }
.gender-option[aria-checked='true'] { color: var(--color-primary); font-weight: 600; }
.selected-mark { font-size: 20px; }
.date-picker { position: relative; width: 100%; height: 242px; display: grid; grid-template-columns: repeat(3, 1fr); overflow: hidden; background: var(--color-surface); }
.wheel-column { position: relative; z-index: 1; height: 242px; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none; scroll-behavior: smooth; scroll-snap-type: y mandatory; }
.wheel-column::-webkit-scrollbar { display: none; }
.wheel-column::before, .wheel-column::after { content: ''; display: block; height: 99px; }
.picker-option { height: 44px; display: flex; align-items: center; justify-content: center; color: var(--color-text); font-size: 16px; scroll-snap-align: center; }
.wheel-indicator { position: absolute; z-index: 0; top: 99px; right: 10px; left: 10px; height: 44px; border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); background: var(--color-primary-soft); pointer-events: none; }
.toolbar-action:focus-visible, .gender-option:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
@media (prefers-reduced-motion: reduce) { .wheel-column { scroll-behavior: auto; } }
</style>
