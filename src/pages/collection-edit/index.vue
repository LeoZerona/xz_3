<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import FeaturePage from '../../components/FeaturePage.vue'
import FeatureTextField from '../../components/FeatureTextField.vue'
import { readCollection, saveCollection } from '../../collections/repository'
import { confirmFeature, finishFeatureEdit, useFeatureAction, useFeatureTask } from '../../features/useFeatureTask'

const id = ref('')
const name = ref('')
const description = ref('')
const original = ref('')
const { busy, actionError, perform } = useFeatureAction()
onLoad((options) => { id.value = typeof options?.id === 'string' ? options.id : '' })
const value = computed(() => JSON.stringify([name.value, description.value]))
const { loading, error, reload } = useFeatureTask(async () => {
  if (id.value) { const current = await readCollection(id.value); name.value = current.name; description.value = current.description }
  original.value = value.value
}, { refreshOnShow: false, beforeBack: confirmDiscard, backUrl: '/pages/collections/index' })
function confirmDiscard(): Promise<boolean> {
  if (busy.value) return Promise.resolve(false)
  return original.value === value.value ? Promise.resolve(true) : confirmFeature('放弃未保存的修改？', '返回后本次修改不会保存，已有字单不受影响。', '放弃修改')
}
function handleSave(): void {
  void perform(async () => {
    const savedId = await saveCollection({ id: id.value || undefined, name: name.value, description: description.value })
    original.value = value.value
    await finishFeatureEdit(`/pages/collection-detail/index?id=${encodeURIComponent(savedId)}`)
  })
}
</script>

<template>
  <FeaturePage :title="id ? '编辑字单' : '新建字单'" back-url="/pages/collections/index" :loading="loading" :error="error" :before-back="confirmDiscard" @retry="reload">
    <FeatureTextField v-model="name" label="字单名称" :maxlength="60" placeholder="例如：字形易混字" />
    <p class="feature-muted">{{ Array.from(name).length }} / 30 字</p>
    <FeatureTextField v-model="description" label="字单说明（可选）" :maxlength="1000" placeholder="记录这组文字的来源、学习目标或辨认要点" multiline />
    <p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p>
    <p class="feature-note">字单是文字分组。建立后可以搜索选字、粘贴汉字组、管理成员，或开始独立专项练习。</p>
    <template #footer><button role="button" class="feature-button" :disabled="busy" @click="handleSave">{{ busy ? '正在保存…' : '保存字单' }}</button></template>
  </FeaturePage>
</template>
