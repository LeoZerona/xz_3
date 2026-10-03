<script setup lang="ts">
import { ref } from 'vue'

interface SettingItem {
  label: string
  url?: string
}

const SENIOR_MODE_STORAGE_KEY = 'morning-pages:senior-mode'

const primaryItems: SettingItem[] = [
  { label: '学习提醒' },
  { label: '学习设置' },
  { label: '显示设置', url: '/pages/theme/index' },
  { label: '隐私设置' },
]

const informationItems: SettingItem[] = [
  { label: '缓存管理' },
  { label: '个人信息收集清单' },
  { label: '第三方合作清单' },
  { label: '关于我们' },
]

const isSeniorMode = ref(readSeniorMode())

function readSeniorMode() {
  try {
    return uni.getStorageSync(SENIOR_MODE_STORAGE_KEY) === true
  } catch {
    // 浏览器隐私模式不可用时，回退为默认关闭状态。
    return false
  }
}

function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack({ delta: 1, fail: goToProfile })
    return
  }
  goToProfile()
}

function goToProfile() {
  uni.reLaunch({ url: '/pages/profile/index' })
}

function showPlaceholder(label: string) {
  uni.showToast({ title: `${label}功能开发中`, icon: 'none' })
}

function handleSetting(item: SettingItem) {
  if (!item.url) {
    showPlaceholder(item.label)
    return
  }

  uni.navigateTo({
    url: item.url,
    fail: () => uni.showToast({ title: `暂时无法打开${item.label}`, icon: 'none' }),
  })
}

function saveSeniorMode(nextValue: boolean) {
  try {
    uni.setStorageSync(SENIOR_MODE_STORAGE_KEY, nextValue)
  } catch {
    // 存储失败不阻断当前会话中的设置切换。
  }

  uni.showToast({ title: nextValue ? '已开启长辈版' : '已关闭长辈版', icon: 'none' })
}
</script>

<template>
  <view class="settings-page" :class="{ 'is-senior-mode': isSeniorMode }">
    <view class="settings-nav">
      <button class="back-button" role="button" aria-label="返回" @click="goBack">
        <van-icon name="arrow-left" size="24" aria-hidden="true" />
      </button>
      <text class="nav-title">设置</text>
      <view aria-hidden="true" />
    </view>

    <view class="settings-content">
      <view class="settings-group account-group">
        <button class="setting-row account-row" role="button" aria-label="账号管理" @click="showPlaceholder('账号管理')">
          <text class="setting-label">账号管理</text>
          <view class="account-channels" aria-hidden="true">
            <view class="channel-icon"><van-icon name="phone-o" size="19" /></view>
            <view class="channel-icon"><van-icon name="chat-o" size="19" /></view>
            <view class="channel-icon"><van-icon name="bell" size="19" /></view>
          </view>
          <van-icon class="setting-arrow" name="arrow" size="17" aria-hidden="true" />
        </button>
      </view>

      <view class="settings-group">
        <button
          v-for="item in primaryItems"
          :key="item.label"
          class="setting-row"
          role="button"
          :aria-label="item.label"
          @click="handleSetting(item)"
        >
          <text class="setting-label">{{ item.label }}</text>
          <text v-if="item.url" class="setting-note">主题配色</text>
          <van-icon class="setting-arrow" name="arrow" size="17" aria-hidden="true" />
        </button>

        <view class="setting-row senior-row">
          <text class="setting-label">长辈版</text>
          <van-switch
            v-model="isSeniorMode"
            size="28px"
            aria-label="长辈版"
            @change="saveSeniorMode"
          />
        </view>
      </view>

      <view class="settings-group">
        <button
          v-for="item in informationItems"
          :key="item.label"
          class="setting-row"
          role="button"
          :aria-label="item.label"
          @click="handleSetting(item)"
        >
          <text class="setting-label">{{ item.label }}</text>
          <van-icon class="setting-arrow" name="arrow" size="17" aria-hidden="true" />
        </button>
      </view>

      <button class="logout-button" role="button" aria-label="退出登录" @click="showPlaceholder('退出登录')">
        退出登录
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.settings-page {
  width: min(100%, 560px);
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0 auto;
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.settings-nav {
  position: sticky;
  z-index: 2;
  top: 0;
  height: calc(54px + var(--app-top-safe-area));
  padding: var(--app-top-safe-area) 12px 0;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.back-button {
  width: 44px;
  height: 44px;
  margin: 0;
  padding: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text);
}

.back-button:active { background: var(--color-primary-soft); }
.nav-title { font-size: 17px; font-weight: 700; text-align: center; }

.settings-content {
  padding: 10px 0 calc(24px + env(safe-area-inset-bottom));
}

.settings-group {
  padding: 0 18px;
  background: var(--color-surface);
}

.settings-group + .settings-group { margin-top: 10px; }
.account-group { margin-bottom: 10px; }

.setting-row {
  width: 100%;
  min-height: 60px;
  margin: 0;
  padding: 0 2px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 0;
  background: var(--color-surface);
  color: var(--color-text);
  text-align: left;
}

.setting-row + .setting-row { border-top: 1px solid var(--color-border); }
.setting-row::after, .back-button::after, .logout-button::after { border: 0; }
.setting-row:active { background: var(--color-primary-soft); }
.setting-row:focus-visible, .back-button:focus-visible, .logout-button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.setting-label { min-width: 0; flex: 1; font-size: 15px; font-weight: 500; }
.setting-note { color: var(--color-text-muted); font-size: 10px; }
.setting-arrow { flex: none; color: var(--color-text-muted); }

.account-row { min-height: 70px; }
.account-channels { display: flex; align-items: center; gap: 8px; }
.channel-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.senior-row :deep(.van-switch) {
  flex: none;
  --van-switch-background: var(--color-text-muted);
  --van-switch-on-background: var(--color-primary);
}

.logout-button {
  width: calc(100% - 36px);
  min-height: 46px;
  margin: 16px 18px 0;
  padding: 0 16px;
  border: 1px solid color-mix(in srgb, var(--color-primary) 22%, var(--color-border));
  border-radius: 12px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: 15px;
  font-weight: 600;
}

.logout-button:active { background: var(--color-selection); }
.settings-page.is-senior-mode .setting-label,
.settings-page.is-senior-mode .logout-button { font-size: 18px; }
.settings-page.is-senior-mode .setting-row { min-height: 68px; }

@supports not (color: color-mix(in srgb, black, white)) {
  .logout-button { border-color: var(--color-border); }
}

</style>
