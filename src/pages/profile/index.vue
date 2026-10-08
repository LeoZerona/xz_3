<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import AppBottomNavigation from '../../components/AppBottomNavigation.vue'
import { useProfileStore } from '../../stores/profile'

type MenuItem = {
  label: string
  icon: string
  url?: string
  note?: string
}

const profileStore = useProfileStore()
const { profile } = storeToRefs(profileStore)

onMounted(() => { void profileStore.initialize() })

const menuSections: MenuItem[][] = [
  [
    { label: '我的日历', icon: 'calendar-o' },
    { label: '我的学习', icon: 'play-circle-o' },
    { label: '我的词汇量', icon: 'chart-trending-o' },
  ],
  [
    { label: '我的收藏', icon: 'star-o' },
    { label: '我的图书', icon: 'orders-o' },
  ],
  [
    { label: '主题配色', icon: 'brush-o', url: '/pages/theme/index', note: '跟随全局' },
    { label: '学习提醒', icon: 'clock-o' },
    { label: '数据与隐私', icon: 'shield-o' },
  ],
  [
    { label: '帮助与反馈', icon: 'question-o' },
    { label: '关于我们', icon: 'info-o' },
  ],
]

function showPlaceholder(label: string) {
  uni.showToast({ title: `${label}功能开发中`, icon: 'none' })
}

function handleMenu(item: MenuItem) {
  if (item.url) {
    uni.navigateTo({
      url: item.url,
      fail: () => showPlaceholder(item.label),
    })
    return
  }
  showPlaceholder(item.label)
}

function openSettings() {
  uni.navigateTo({
    url: '/pages/settings/index',
    fail: () => uni.showToast({ title: '暂时无法打开设置', icon: 'none' }),
  })
}

function openPersonalProfile() {
  uni.navigateTo({
    url: '/pages/personal-profile/index',
    fail: () => uni.showToast({ title: '暂时无法打开个人资料', icon: 'none' }),
  })
}
</script>

<template>
  <view class="profile-page">
    <view class="profile-scroll">
      <view class="profile-header">
        <view class="header-actions">
          <button class="header-action" aria-label="扫一扫" @click="showPlaceholder('扫一扫')">
            <van-icon name="scan" size="24" aria-hidden="true" />
          </button>
          <button class="header-action" role="button" aria-label="个人设置" @click="openSettings">
            <van-icon name="setting-o" size="24" aria-hidden="true" />
          </button>
        </view>

        <view
          class="identity"
          role="button"
          tabindex="0"
          aria-label="查看个人资料"
          @click="openPersonalProfile"
          @keydown.enter="openPersonalProfile"
          @keydown.space.prevent="openPersonalProfile"
        >
          <view class="avatar" aria-hidden="true">
            <view class="avatar-head" />
            <view class="avatar-body" />
          </view>
          <view class="identity-copy">
            <text class="user-name">{{ profile.nickname }}</text>
            <view class="user-meta">
              <text>BczID: 1835661333</text>
            </view>
          </view>
          <van-icon class="identity-arrow" name="arrow" size="18" aria-hidden="true" />
        </view>
      </view>

      <view class="study-summary">
        <view class="summary-chart" aria-hidden="true">
          <i /><i /><i />
        </view>
        <text>累计已学 <strong>0</strong>，坚持 <strong>0</strong> 天</text>
      </view>

      <view class="menu-area">
        <view v-for="(section, sectionIndex) in menuSections" :key="sectionIndex" class="menu-section">
          <view
            v-for="item in section"
            :key="item.label"
            class="menu-item"
            role="button"
            tabindex="0"
            :aria-label="item.label"
            @click="handleMenu(item)"
            @keydown.enter="handleMenu(item)"
            @keydown.space.prevent="handleMenu(item)"
          >
            <view class="menu-icon" aria-hidden="true"><van-icon :name="item.icon" size="25" /></view>
            <text class="menu-label">{{ item.label }}</text>
            <text v-if="item.note" class="menu-note">{{ item.note }}</text>
            <van-icon name="arrow" size="17" class="menu-arrow" aria-hidden="true" />
          </view>
        </view>
      </view>

      <text class="scroll-hint">已经到底啦</text>
    </view>

    <AppBottomNavigation
      active-tab="profile"
      fixed
      @unavailable="showPlaceholder"
    />
  </view>
</template>

<style scoped lang="scss">
.profile-page {
  width: min(100%, 560px);
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0 auto;
  background: var(--color-surface-muted);
  color: var(--color-text);
}
.profile-scroll {
  min-height: 100vh;
  min-height: 100dvh;
  padding-bottom: calc(88px + env(safe-area-inset-bottom));
}
.profile-header {
  padding: calc(8px + var(--app-top-safe-area)) 20px 18px;
  background: var(--color-topbar);
}
.header-actions {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.header-action {
  width: 40px;
  height: 40px;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text);
}
.header-action::after { border: 0; }
.identity {
  min-width: 0;
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
}
.identity:focus-visible, .menu-item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}
.avatar {
  position: relative;
  flex: none;
  width: 70px;
  height: 70px;
  overflow: hidden;
  border: 3px solid color-mix(in srgb, var(--color-surface) 72%, transparent);
  border-radius: 50%;
  background: var(--color-primary-soft);
  box-shadow: 0 3px 12px var(--color-shadow);
}
.avatar-head {
  position: absolute;
  top: 13px;
  left: 50%;
  width: 24px;
  height: 24px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-primary) 28%, var(--color-surface));
}
.avatar-body {
  position: absolute;
  right: 12px;
  bottom: -8px;
  left: 12px;
  height: 37px;
  border-radius: 22px 22px 8px 8px;
  background: color-mix(in srgb, var(--color-primary) 28%, var(--color-surface));
}
.identity-copy { min-width: 0; flex: 1; }
.user-name {
  display: block;
  overflow: hidden;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-meta {
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--color-text-secondary);
  font-size: 9px;
}
.identity-arrow { flex: none; color: var(--color-text-muted); }
.study-summary {
  min-height: 70px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  font-size: 13px;
  font-weight: 600;
}
.study-summary strong { font-weight: 800; }
.summary-chart {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: flex-end;
  gap: 3px;
}
.summary-chart i {
  width: 6px;
  height: 12px;
  border-radius: 2px 2px 0 0;
  background: var(--color-primary);
  opacity: .45;
}
.summary-chart i:nth-child(2) { height: 22px; opacity: .7; }
.summary-chart i:nth-child(3) { height: 17px; opacity: 1; }
.menu-area { padding: 10px 12px 3px; }
.menu-section {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  box-shadow: 0 3px 12px var(--color-shadow);
}
.menu-section + .menu-section { margin-top: 10px; }
.menu-item {
  min-height: 58px;
  margin: 0 18px;
  display: flex;
  align-items: center;
  color: var(--color-text);
}
.menu-item + .menu-item { border-top: 1px solid var(--color-border); }
.menu-item:active { background: var(--color-primary-soft); }
.menu-icon {
  flex: none;
  width: 35px;
  display: flex;
  align-items: center;
  color: var(--color-primary);
}
.menu-label { flex: 1; font-size: 13px; font-weight: 500; }
.menu-note {
  margin-right: 7px;
  color: var(--color-text-muted);
  font-size: 8px;
}
.menu-arrow { flex: none; color: var(--color-text-muted); }
.scroll-hint {
  display: block;
  padding: 14px 0 10px;
  color: var(--color-text-muted);
  font-size: 8px;
  text-align: center;
}
@supports not (color: color-mix(in srgb, black, white)) {
  .avatar { border-color: var(--color-surface); }
  .avatar-head, .avatar-body { background: var(--color-primary); opacity: .28; }
}
@media (max-width: 370px) {
  .profile-header { padding-right: 16px; padding-left: 16px; }
  .identity { gap: 12px; }
  .avatar { width: 62px; height: 62px; }
  .user-name { font-size: 14px; }
  .user-meta { font-size: 8px; }
}
</style>
