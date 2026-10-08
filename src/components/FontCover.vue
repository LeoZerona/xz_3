<script setup lang="ts">
import type { LearningFont } from '../fonts/types'

withDefaults(defineProps<{
  font: LearningFont
  size?: 'small' | 'large'
  sampleOnly?: boolean
}>(), {
  sampleOnly: false,
})
</script>

<template>
  <view class="font-cover" :class="[`tone-${font.coverTone}`, { 'is-large': size === 'large', 'is-sample-only': sampleOnly }]" aria-hidden="true">
    <text v-if="!sampleOnly" class="cover-name" :style="{ fontFamily: font.fontFamily }">{{ font.name }}</text>
    <text class="cover-sample" :style="{ fontFamily: font.fontFamily }">{{ font.sample }}</text>
  </view>
</template>

<style scoped>
.font-cover { position: relative; flex: none; width: 64px; height: 86px; padding: 8px 7px; overflow: hidden; border-radius: 3px; box-shadow: inset 4px 0 0 #ffffff52, 0 2px 4px #00000016; color: #fff; }
.font-cover.is-large { width: 74px; height: 96px; padding: 9px 8px; }
.tone-green { background: #1db98a; }
.tone-blue { background: #4778e9; }
.tone-orange { background: #f29a20; }
.tone-rose { background: #e84e78; }
.tone-teal { background: #1aa994; }
.cover-name { position: relative; z-index: 1; display: block; overflow: hidden; font-size: 7px; font-weight: 700; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.cover-sample { position: absolute; right: -2px; bottom: -14px; color: #073d3340; font-size: 62px; font-weight: 700; line-height: 1; }
.is-large .cover-sample { right: 0; bottom: -16px; font-size: 68px; }
.font-cover.is-sample-only { display: flex; align-items: center; justify-content: center; }
.is-sample-only .cover-sample { position: static; color: #fff; font-size: 44px; font-weight: 400; line-height: 1; }
</style>
