<script setup lang="ts">
import { computed } from 'vue'
import type { DeviceBattery } from '../../../reading/deviceBattery'

interface Props {
  pageLabel: string
  battery: DeviceBattery | null
}

const props = defineProps<Props>()
const batteryLabel = computed(() => props.battery
  ? `电量 ${props.battery.level}%${props.battery.isCharging ? '，正在充电' : ''}`
  : '当前设备不支持读取电量')
const batteryText = computed(() => props.battery ? `${props.battery.level}%` : '--')
const batteryFillStyle = computed(() => ({ width: `${props.battery?.level ?? 0}%` }))
</script>

<template>
  <view class="reading-status-bar" aria-label="阅读状态" @click.stop @touchstart.stop @touchmove.stop @touchend.stop @touchcancel.stop>
    <text class="reading-page-label">{{ pageLabel }}</text>
    <view class="reading-battery" role="img" :aria-label="batteryLabel" :title="batteryLabel">
      <text v-if="battery?.isCharging" class="battery-charging" aria-hidden="true">ϟ</text>
      <view class="battery-outline" aria-hidden="true">
        <view class="battery-fill" :style="batteryFillStyle" />
      </view>
      <text class="battery-value" aria-hidden="true">{{ batteryText }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.reading-status-bar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 18px;
  color: var(--color-text-secondary);
  font-size: 10px;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
  user-select: none;
}
.reading-page-label { min-width: 0; }
.reading-battery { flex: none; display: flex; align-items: center; gap: 5px; }
.battery-outline { position: relative; width: 17px; height: 9px; padding: 1px; border: 1px solid currentColor; border-radius: 2px; box-sizing: border-box; }
.battery-outline::after { content: ''; position: absolute; right: -3px; top: 2px; width: 2px; height: 3px; background: currentColor; border-radius: 0 1px 1px 0; }
.battery-fill { height: 100%; background: currentColor; border-radius: 1px; }
.battery-value { min-width: 27px; text-align: right; }
.battery-charging { font-size: 13px; }
</style>
