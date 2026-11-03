<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import FeaturePage from '../../components/FeaturePage.vue'
import FeatureTextField from '../../components/FeatureTextField.vue'
import CharacterRows from '../../collections/CharacterRows.vue'
import { findCharactersByText, getCharacters, searchCatalog } from '../../database/catalog'
import { parseCollectionText } from '../../collections/model'
import { readCollection, setCollectionMembers } from '../../collections/repository'
import { confirmFeature, finishFeatureEdit, openFeature, useFeatureAction, useFeatureTask } from '../../features/useFeatureTask'
import type { StudyCharacterEntry } from '../../study/types'

const id = ref('')
const isAdding = ref(false)
const name = ref('')
const originalIds = ref<string[]>([])
const selectedIds = ref<string[]>([])
const entries = ref<StudyCharacterEntry[]>([])
const query = ref('')
const inputText = ref('')
const preview = ref<StudyCharacterEntry[]>([])
const missing = ref<string[]>([])
const hasPreview = ref(false)
const pageSize = ref(50)
let searchSequence = 0
const { busy, actionError, perform } = useFeatureAction()
onLoad((options) => { id.value = typeof options?.id === 'string' ? options.id : ''; isAdding.value = options?.mode === 'add' })
const { loading, error, reload } = useFeatureTask(async () => {
  const current = await readCollection(id.value)
  name.value = current.name; originalIds.value = [...current.characterIds]; selectedIds.value = [...current.characterIds]
  entries.value = await getCharacters(current.characterIds)
}, { refreshOnShow: false, beforeBack: confirmDiscard, backUrl: '/pages/collections/index' })
const visible = computed(() => entries.value.slice(0, pageSize.value))
const hasMemberChanges = computed(() => originalIds.value.join(',') !== selectedIds.value.join(','))
const shouldAddPreview = computed(() => isAdding.value && hasPreview.value)
const isDirty = computed(() => hasMemberChanges.value || Boolean(inputText.value.trim()))
const canSave = computed(() => !busy.value && (shouldAddPreview.value ? preview.value.length > 0 : hasMemberChanges.value))
watch(query, async () => {
  const sequence = ++searchSequence
  try {
    if (!query.value.trim()) { const original = await getCharacters(originalIds.value); if (sequence === searchSequence) entries.value = original; return }
    const result = await searchCatalog(query.value, 50, 0, 'all')
    const characters = await getCharacters(result.entries.map((entry) => entry.id))
    if (sequence === searchSequence) entries.value = characters
  } catch (cause) { if (sequence === searchSequence) actionError.value = cause instanceof Error ? cause.message : '搜索失败，请重试' }
})
watch(inputText, () => { hasPreview.value = false; preview.value = []; missing.value = [] })
onBeforeUnmount(() => { searchSequence++ })
function handleToggle(characterId: string): void {
  selectedIds.value = selectedIds.value.includes(characterId) ? selectedIds.value.filter((entry) => entry !== characterId) : [...selectedIds.value, characterId]
}
function handleDetail(characterId: string): void {
  void perform(() => openFeature(`/pages/character-detail/index?id=${encodeURIComponent(characterId)}`))
}
function handlePreview(): void {
  void perform(async () => {
    const parsed = parseCollectionText(inputText.value)
    if (parsed.invalid.length) throw new Error(`请移除非汉字内容：${parsed.invalid.join(' ')}`)
    if (!parsed.characters.length) throw new Error('请先输入要添加的汉字')
    const found = await findCharactersByText(parsed.characters)
    preview.value = found.entries; missing.value = found.missing; hasPreview.value = true
  })
}
function handleSave(addPreview = false): void {
  void perform(async () => {
    const next = addPreview ? [...new Set([...selectedIds.value, ...preview.value.map((entry) => entry.id)])] : selectedIds.value
    await setCollectionMembers(id.value, next)
    originalIds.value = [...next]; selectedIds.value = [...next]
    inputText.value = ''
    await finishFeatureEdit(`/pages/collection-detail/index?id=${encodeURIComponent(id.value)}`)
  })
}
function confirmDiscard(): Promise<boolean> { if (busy.value) return Promise.resolve(false); return isDirty.value ? confirmFeature('放弃成员修改？', '未保存的增删将不生效，原字单和学习记录保留。', '放弃修改') : Promise.resolve(true) }
</script>

<template>
  <FeaturePage :title="isAdding ? '添加文字' : '管理文字'" back-url="/pages/collections/index" :loading="loading" :error="error" :before-back="confirmDiscard" @retry="reload">
    <p class="feature-muted">{{ name }} · 已选 {{ selectedIds.length }} 字</p>
    <template v-if="isAdding">
      <FeatureTextField v-model="inputText" label="输入汉字" :maxlength="5000" placeholder="粘贴汉字组，如：未末己已巳；支持空格或逗号分隔" multiline />
      <button role="button" class="feature-button secondary" :disabled="busy" @click="handlePreview">预览添加</button>
      <section v-if="hasPreview"><div class="feature-section-title"><h2>本次预览 · {{ preview.length }} 个已收录字</h2></div><p v-if="missing.length" class="feature-note" role="status">未收录：{{ missing.join('、') }}</p><CharacterRows :entries="preview" @item-click="handleDetail" /><p class="feature-muted">重复文字自动合并，未收录文字不会写入字单。</p></section>
    </template>
    <div class="feature-section-title"><h2>{{ isAdding ? '或搜索选字' : '选择要保留的成员' }}</h2></div>
    <FeatureTextField v-model="query" label="搜索字单成员" placeholder="输入汉字或拼音搜索完整字库" hide-label />
    <p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p>
    <CharacterRows :entries="visible" selectable :selected-ids="selectedIds" @item-click="handleToggle" />
    <p v-if="!visible.length" class="feature-note">{{ query ? '没有匹配的文字，换个汉字或拼音试试。' : '当前字单没有成员，可以在上方输入或搜索添加。' }}</p>
    <button role="button" v-if="visible.length < entries.length" class="feature-link" @click="pageSize += 50">加载更多成员</button>
    <p class="feature-note">取消勾选只移出当前字单，不取消收藏，也不删除学习和复习记录。</p>
    <template #footer><button role="button" class="feature-button" :disabled="!canSave" @click="handleSave(shouldAddPreview)">{{ shouldAddPreview ? '加入字单' : '保存成员' }}</button></template>
  </FeaturePage>
</template>
