<script setup lang="ts">
type TabKey = 'study' | 'character' | 'reading' | 'profile'

type NavigationItem = {
  key: TabKey
  label: string
  icon: string
  url?: string
  openType?: 'navigate' | 'reLaunch'
}

const props = withDefaults(defineProps<{
  activeTab: TabKey
  fixed?: boolean
}>(), {
  fixed: false,
})

const emit = defineEmits<{
  (event: 'unavailable', label: string): void
}>()

const navigationItems: NavigationItem[] = [
  { key: 'study', label: '学习', icon: 'desktop-o', url: '/pages/index/index', openType: 'reLaunch' },
  { key: 'character', label: '单字练习', icon: 'edit' },
  { key: 'reading', label: '对照阅读', icon: 'notes-o' },
  { key: 'profile', label: '我', icon: 'contact-o', url: '/pages/profile/index', openType: 'navigate' },
]

function handleUnavailable(item: NavigationItem) {
  if (item.key !== props.activeTab) {
    emit('unavailable', item.label)
  }
}
</script>

<template>
  <view
    class="bottom-navigation"
    :class="{ 'is-fixed': fixed }"
    role="navigation"
    aria-label="主导航"
  >
    <template v-for="item in navigationItems" :key="item.key">
      <view
        v-if="item.key === activeTab"
        class="navigation-item is-active"
        aria-current="page"
      >
        <view class="navigation-content">
          <van-icon :name="item.icon" size="23" aria-hidden="true" />
          <text class="navigation-label">{{ item.label }}</text>
        </view>
      </view>
      <navigator
        v-else-if="item.url"
        class="navigation-item"
        :url="item.url"
        :open-type="item.openType"
        hover-class="none"
        :aria-label="item.label"
      >
        <view class="navigation-content">
          <van-icon :name="item.icon" size="23" aria-hidden="true" />
          <text class="navigation-label">{{ item.label }}</text>
        </view>
      </navigator>
      <view
        v-else
        class="navigation-item"
        role="button"
        tabindex="0"
        :aria-label="item.label"
        @click="handleUnavailable(item)"
        @keydown.enter="handleUnavailable(item)"
        @keydown.space.prevent="handleUnavailable(item)"
      >
        <view class="navigation-content">
          <van-icon :name="item.icon" size="23" aria-hidden="true" />
          <text class="navigation-label">{{ item.label }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.bottom-navigation {
  min-height: 72px;
  margin-top: auto;
  padding-bottom: env(safe-area-inset-bottom);
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 0 -4px 16px var(--color-shadow);
}

.bottom-navigation.is-fixed {
  position: fixed;
  z-index: 10;
  right: max(0px, calc((100vw - 560px) / 2));
  bottom: 0;
  left: max(0px, calc((100vw - 560px) / 2));
  margin-top: 0;
}

.navigation-item {
  min-width: 0;
  color: var(--color-text-muted);
  font-size: 7px;
  cursor: pointer;
}

.navigation-content {
  width: 100%;
  height: 100%;
  min-height: 72px;
  display: grid;
  grid-template-rows: 23px auto;
  align-content: center;
  justify-items: center;
  row-gap: 4px;
}

.navigation-item.is-active {
  color: var(--color-primary);
}

.navigation-label {
  display: block;
  line-height: 1.2;
  white-space: nowrap;
}
</style>
