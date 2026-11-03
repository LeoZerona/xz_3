<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useFontStore } from '../stores/fonts'
import type { StudyCharacterEntry } from '../study/types'

withDefaults(defineProps<{ entries: StudyCharacterEntry[]; selectable?: boolean; selectedIds?: string[] }>(), {
  selectable: false, selectedIds: () => [],
})
const emit = defineEmits<{ (event: 'item-click', id: string): void }>()
const { currentFont } = storeToRefs(useFontStore())
</script>

<template>
  <button v-for="entry in entries" :key="entry.id" class="feature-row" :role="selectable ? 'checkbox' : 'button'"
    :aria-checked="selectable ? selectedIds.includes(entry.id) : undefined"
    :aria-label="selectable ? `选择${entry.script_forms.simplified}` : `查看${entry.script_forms.simplified}的文字详情`"
    @click="emit('item-click', entry.id)">
    <span v-if="selectable" class="feature-selection" :class="{ selected: selectedIds.includes(entry.id) }" aria-hidden="true">{{ selectedIds.includes(entry.id) ? '✓' : '' }}</span>
    <span class="feature-glyph" :style="{ fontFamily: currentFont.fontFamily }" aria-hidden="true">{{ entry.script_forms.simplified }}</span>
    <span class="feature-row-copy"><strong>{{ entry.script_forms.simplified }} <span class="feature-muted">{{ entry.phonetics.pinyin }}</span></strong><p class="feature-muted">{{ entry.semantics.definition }}</p></span>
    <slot name="meta" :entry="entry" />
    <van-icon v-if="!selectable" name="arrow" size="15" aria-hidden="true" />
  </button>
</template>
