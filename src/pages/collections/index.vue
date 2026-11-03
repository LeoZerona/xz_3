<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import FeaturePage from '../../components/FeaturePage.vue'
import FeatureTextField from '../../components/FeatureTextField.vue'
import CharacterRows from '../../collections/CharacterRows.vue'
import { getCharacters } from '../../database/catalog'
import { flushPersistence } from '../../database/persistence'
import { listCollections } from '../../collections/repository'
import { useCharacterLearningStore } from '../../stores/characterLearning'
import { useLevelReviewStore } from '../../stores/levelReview'
import { matchesCharacterQuery } from '../../collections/model'
import { confirmFeature, openFeature, useFeatureAction, useFeatureTask } from '../../features/useFeatureTask'
import type { Collection, CollectionTab } from '../../collections/types'
import type { StudyCharacterEntry } from '../../study/types'

const learning = useCharacterLearningStore()
const review = useLevelReviewStore()
const tab = ref<CollectionTab>('favorites')
const query = ref('')
const level = ref('all')
const status = ref('all')
const sort = ref('newest')
const pageSize = ref(50)
const entries = ref<StudyCharacterEntry[]>([])
const collections = ref<Collection[]>([])
const selectedIds = ref<string[]>([])
const isManaging = ref(false)
const { busy, actionError, perform } = useFeatureAction()
const { loading, error, reload } = useFeatureTask(async () => {
  learning.hydrate(); review.hydrate()
  if (tab.value === 'collections') collections.value = await listCollections({ query: query.value, limit: pageSize.value })
  else entries.value = await getCharacters(tab.value === 'favorites' ? learning.favoriteIds : learning.excludedIds)
})
const tabs: Array<{ id: CollectionTab; label: string }> = [
  { id: 'favorites', label: '收藏字' }, { id: 'collections', label: '自定义字单' }, { id: 'slashed', label: '斩字管理' },
]
const filtered = computed(() => {
  return entries.value.filter((entry) => {
    const matches = matchesCharacterQuery(entry, query.value)
    const isLearned = learning.isCharacterComplete(entry.id)
    const isDue = review.records[entry.id] && Date.parse(review.records[entry.id]!.dueAt) <= Date.now()
    return matches && (level.value === 'all' || String(entry.level ?? 1) === level.value)
      && (status.value === 'all' || status.value === 'learned' && isLearned || status.value === 'unlearned' && !isLearned || status.value === 'due' && isDue)
  }).sort((a, b) => {
    if (sort.value === 'pinyin') return a.phonetics.pinyin.localeCompare(b.phonetics.pinyin, 'zh-CN')
    const aRecord = learning.getRecord(a.id); const bRecord = learning.getRecord(b.id)
    const aAt = tab.value === 'slashed' ? aRecord?.slash.changedAt : aRecord?.favorite.changedAt
    const bAt = tab.value === 'slashed' ? bRecord?.slash.changedAt : bRecord?.favorite.changedAt
    return (bAt ?? '').localeCompare(aAt ?? '')
  })
})
const visible = computed(() => filtered.value.slice(0, pageSize.value))
watch(tab, () => { query.value = ''; pageSize.value = 50; selectedIds.value = []; isManaging.value = false; void reload() })
watch(query, () => { pageSize.value = 50; if (tab.value === 'collections') void reload() })

function handleCharacter(id: string): void {
  if (isManaging.value) selectedIds.value = selectedIds.value.includes(id) ? selectedIds.value.filter((entry) => entry !== id) : [...selectedIds.value, id]
  else void perform(() => openFeature(`/pages/character-detail/index?id=${encodeURIComponent(id)}`))
}
function handleBulk(): void {
  void perform(async () => {
    if (!selectedIds.value.length) throw new Error('请先选择文字')
    const isSlash = tab.value === 'slashed'
    if (!await confirmFeature(isSlash ? '恢复所选文字' : '移除所选收藏', `将处理 ${selectedIds.value.length} 个文字；已有学习记录保留。`)) return
    for (const id of selectedIds.value) {
      if (isSlash) learning.setSlashState(id, false)
      else if (learning.isFavorite(id)) learning.toggleFavorite(id)
    }
    await flushPersistence(); selectedIds.value = []; isManaging.value = false; await reload()
  })
}
function handleMore(): void { pageSize.value += 50; if (tab.value === 'collections') void reload() }
function handleOpen(url: string): void { void perform(() => openFeature(url)) }
</script>

<template>
  <FeaturePage title="我的收藏" :loading="loading" :error="error" @retry="reload">
    <div class="feature-tabs" role="tablist" aria-label="收藏分类">
      <button v-for="item in tabs" :key="item.id" class="feature-tab" :class="{ active: tab === item.id }" role="tab" :aria-selected="tab === item.id" @click="tab = item.id">{{ item.label }}</button>
    </div>
    <FeatureTextField v-model="query" :label="tab === 'collections' ? '搜索字单' : '搜索收藏文字'" :placeholder="tab === 'collections' ? '搜索字单名称或说明' : '搜索汉字或拼音'" hide-label />
    <p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p>
    <template v-if="tab === 'collections'">
      <div class="feature-section-title"><h2>我的字单</h2><button role="button" class="feature-link" @click="handleOpen('/pages/collection-edit/index')">新建字单</button></div>
      <button role="button" v-for="item in collections" :key="item.id" class="feature-row" @click="handleOpen(`/pages/collection-detail/index?id=${encodeURIComponent(item.id)}`)">
        <span class="feature-row-copy"><strong>{{ item.name }}</strong><p class="feature-muted">{{ item.description || '还没有说明' }}</p></span><span class="feature-tag">{{ item.characterCount }} 字</span><van-icon name="arrow" size="15" aria-hidden="true" />
      </button>
      <div v-if="!collections.length" class="feature-state"><h2>{{ query ? '没有匹配的字单' : '建立你的第一份字单' }}</h2><p>把易混字、阅读生字或一组想加强的文字放在一起。</p><button role="button" v-if="!query" class="feature-button" @click="handleOpen('/pages/collection-edit/index')">创建第一份字单</button></div>
      <button role="button" v-if="collections.length >= pageSize" class="feature-link" @click="handleMore">加载更多字单</button>
      <p class="feature-note">字单只保存分组关系。删除字单不会删除学习记录，也不会取消收藏。</p>
    </template>
    <template v-else>
      <div class="feature-filter-line">
        <select v-model="level" aria-label="文字等级"><option value="all">全部等级</option><option value="1">一级</option><option value="2">二级</option><option value="3">三级</option></select>
        <select v-model="status" aria-label="学习状态"><option value="all">全部状态</option><option value="learned">已学</option><option value="unlearned">未学</option><option value="due">待复习</option></select>
        <select v-model="sort" aria-label="排序"><option value="newest">最近添加</option><option value="pinyin">拼音顺序</option></select>
        <button role="button" class="feature-link" @click="isManaging = !isManaging; selectedIds = []">{{ isManaging ? '结束管理' : '批量管理' }}</button>
      </div>
      <p class="feature-muted">当前范围 {{ filtered.length }} 字<span v-if="isManaging"> · 已选 {{ selectedIds.length }} 字</span></p>
      <CharacterRows :entries="visible" :selectable="isManaging" :selected-ids="selectedIds" @item-click="handleCharacter">
        <template #meta="{ entry }"><span class="feature-tag">{{ learning.isCharacterComplete(entry.id) ? '已学' : '未学' }}</span></template>
      </CharacterRows>
      <div v-if="!filtered.length" class="feature-state"><h2>{{ entries.length ? '没有匹配的文字' : '这里还没有文字' }}</h2><p>{{ tab === 'favorites' ? '在原单字详情或学习页面点击收藏，文字会出现在这里。' : '已斩文字会显示在这里，可以随时恢复参与学习。' }}</p></div>
      <button role="button" v-if="visible.length < filtered.length" class="feature-link" @click="handleMore">加载更多文字</button>
      <p v-if="tab === 'slashed'" class="feature-note">恢复斩字后重新参与学习，已有答题、收藏和历史记录保留。</p>
    </template>
    <template v-if="tab !== 'collections'" #footer>
      <div v-if="isManaging" class="feature-actions"><button role="button" class="feature-button secondary" @click="selectedIds = visible.map((entry) => entry.id)">全选当前页</button><button role="button" class="feature-button" :disabled="busy || !selectedIds.length" @click="handleBulk">{{ tab === 'slashed' ? '恢复所选' : '移除收藏' }}</button></div>
      <button role="button" v-else class="feature-button" :disabled="!filtered.length || busy" @click="handleOpen(`/pages/practice-setup/index?source=${tab}`)">选择文字开始专项</button>
    </template>
  </FeaturePage>
</template>
