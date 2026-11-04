<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import FeaturePage from '../../components/FeaturePage.vue'
import CharacterRows from '../../collections/CharacterRows.vue'
import { getCharacters } from '../../database/catalog'
import { deleteCollection, readCollection } from '../../collections/repository'
import { useCharacterLearningStore } from '../../stores/characterLearning'
import { confirmFeature, openFeature, useFeatureAction, useFeatureTask } from '../../features/useFeatureTask'
import { readFeatureId } from '../../features/routeParams'
import type { CollectionDetail } from '../../collections/types'
import type { StudyCharacterEntry } from '../../study/types'

const id = ref('')
const collection = ref<CollectionDetail | null>(null)
const entries = ref<StudyCharacterEntry[]>([])
const pageSize = ref(50)
const learning = useCharacterLearningStore()
const { busy, actionError, perform } = useFeatureAction()
onLoad((options) => { id.value = readFeatureId(options?.id) })
const { loading, error, reload } = useFeatureTask(async () => {
  collection.value = await readCollection(id.value)
  entries.value = await getCharacters(collection.value.characterIds)
}, { backUrl: '/pages/collections/index' })
const visible = computed(() => entries.value.slice(0, pageSize.value))
const learnedCount = computed(() => entries.value.filter((entry) => learning.isCharacterComplete(entry.id)).length)
function handleOpen(url: string): void { void perform(() => openFeature(url)) }
function handleDelete(): void {
  void perform(async () => {
    if (!await confirmFeature('删除字单', '只删除这份字单和成员关系，收藏、学习及复习记录全部保留。', '删除字单')) return
    await deleteCollection(id.value)
    await openFeature('/pages/collections/index', true)
  })
}
function handleCopy(): void {
  void perform(() => new Promise<void>((resolve, reject) => uni.setClipboardData({
    data: entries.value.map((entry) => entry.script_forms.simplified).join(' '),
    success: () => resolve(), fail: () => reject(new Error('复制失败，请重试')),
  })))
}
</script>

<template>
  <FeaturePage title="字单详情" back-url="/pages/collections/index" :loading="loading" :error="error" @retry="reload">
    <template v-if="collection">
      <section class="feature-hero"><p class="feature-muted">我的自定义字单</p><h2>{{ collection.name }}</h2><p class="feature-muted">{{ collection.description || '为这一组文字添加说明，记录学习目标。' }}</p>
        <div class="feature-stats"><div><strong>{{ entries.length }}</strong><span>文字</span></div><div><strong>{{ learnedCount }}</strong><span>已学</span></div><div><strong>{{ entries.length - learnedCount }}</strong><span>尚未学完</span></div></div>
        <div class="feature-actions"><button role="button" class="feature-button secondary" @click="handleOpen(`/pages/collection-edit/index?id=${encodeURIComponent(id)}`)">编辑字单</button><button role="button" class="feature-button secondary" @click="handleOpen(`/pages/collection-members/index?id=${encodeURIComponent(id)}&mode=add`)">添加文字</button></div>
      </section>
      <p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p>
      <div class="feature-section-title"><h2>全部文字</h2><button role="button" class="feature-link" @click="handleOpen(`/pages/collection-members/index?id=${encodeURIComponent(id)}`)">管理文字</button></div>
      <CharacterRows :entries="visible" @item-click="handleOpen(`/pages/character-detail/index?id=${encodeURIComponent($event)}`)" />
      <div v-if="!entries.length" class="feature-state"><h2>字单里还没有文字</h2><p>通过搜索选字或粘贴汉字组添加成员；会自动去重并提示未收录字。</p></div>
      <button role="button" v-if="visible.length < entries.length" class="feature-link" @click="pageSize += 50">加载更多文字</button>
      <div class="feature-actions"><button role="button" class="feature-link" :disabled="!entries.length || busy" @click="handleCopy">复制字单文字</button><button role="button" class="feature-link" :disabled="busy" @click="handleDelete">删除字单</button></div>
    </template>
    <template #footer><button role="button" class="feature-button" :disabled="!entries.length || busy" @click="handleOpen(`/pages/practice-setup/index?source=collection&id=${encodeURIComponent(id)}`)">开始字单专项</button><p class="feature-muted" style="margin:9px 0 0">临时专项不改变正式复习排期。</p></template>
  </FeaturePage>
</template>
