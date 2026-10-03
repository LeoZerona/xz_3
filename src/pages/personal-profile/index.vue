<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { formatProfileLocation } from '../../profile/profileModel'
import { useProfileStore } from '../../stores/profile'
import ProfileEditSheets from './components/ProfileEditSheets.vue'

type EditableField = 'nickname' | 'gender' | 'birth'

interface ProfileItem {
  key: EditableField
  label: string
  value: string
}

interface ProfileEditSheetsExpose {
  openNickname: () => void
  openGender: () => void
  openBirth: () => void
}

const profileStore = useProfileStore()
const { profile } = storeToRefs(profileStore)
const editSheets = ref<ProfileEditSheetsExpose | null>(null)

const identityItems = computed<ProfileItem[]>(() => [
  { key: 'nickname', label: '昵称', value: profile.value.nickname },
  { key: 'gender', label: '性别', value: profile.value.gender },
  { key: 'birth', label: '出生', value: profile.value.birthDate?.replaceAll('-', '.') ?? '未填写' },
])
const locationText = computed(() => formatProfileLocation(profile.value.location))

onMounted(() => { void profileStore.initialize() })

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

function handleEdit(key: EditableField) {
  if (key === 'nickname') editSheets.value?.openNickname()
  if (key === 'gender') editSheets.value?.openGender()
  if (key === 'birth') editSheets.value?.openBirth()
}

function openLocationPicker() {
  uni.navigateTo({
    url: '/pages/region-picker/index',
    fail: () => uni.showToast({ title: '暂时无法打开地区选择', icon: 'none' }),
  })
}

function handleAvatarEdit() {
  uni.showToast({ title: '头像上传功能开发中', icon: 'none' })
}

function showIpExplanation() {
  uni.showToast({ title: 'IP 属地根据网络信息展示', icon: 'none' })
}
</script>

<template>
  <div class="personal-profile-page">
    <header class="profile-nav">
      <div class="back-button" role="button" tabindex="0" aria-label="返回" @click="goBack" @keydown.enter="goBack" @keydown.space.prevent="goBack">
        <span class="back-glyph" aria-hidden="true">‹</span>
      </div>
      <span class="nav-title">个人资料</span>
      <span aria-hidden="true" />
    </header>

    <main class="profile-content">
      <section class="profile-section">
        <div class="profile-row avatar-row" role="button" tabindex="0" aria-label="编辑头像" @click="handleAvatarEdit" @keydown.enter="handleAvatarEdit" @keydown.space.prevent="handleAvatarEdit">
          <span class="row-label">头像</span>
          <span class="profile-avatar" aria-hidden="true"><span class="avatar-head" /><span class="avatar-body" /></span>
          <span class="row-arrow" aria-hidden="true">›</span>
        </div>

        <div
          v-for="item in identityItems"
          :key="item.key"
          class="profile-row"
          role="button"
          tabindex="0"
          :aria-label="`编辑${item.label}`"
          @click="handleEdit(item.key)"
          @keydown.enter="handleEdit(item.key)"
          @keydown.space.prevent="handleEdit(item.key)"
        >
          <span class="row-label">{{ item.label }}</span>
          <span class="row-value">{{ item.value }}</span>
          <span class="row-arrow" aria-hidden="true">›</span>
        </div>
      </section>

      <section class="profile-section">
        <div class="profile-row" role="button" tabindex="0" aria-label="编辑位置" @click="openLocationPicker" @keydown.enter="openLocationPicker" @keydown.space.prevent="openLocationPicker">
          <span class="row-label">位置</span>
          <span class="row-value">{{ locationText }}</span>
          <span class="row-arrow" aria-hidden="true">›</span>
        </div>
        <div class="profile-row ip-row">
          <span class="row-label">IP属地</span>
          <span class="row-value">福建</span>
          <div class="info-button" role="button" tabindex="0" aria-label="IP 属地说明" @click="showIpExplanation" @keydown.enter="showIpExplanation" @keydown.space.prevent="showIpExplanation"><span aria-hidden="true">i</span></div>
        </div>
      </section>
    </main>

    <ProfileEditSheets ref="editSheets" />
  </div>
</template>

<style scoped lang="scss">
.personal-profile-page { width: min(100%, 560px); min-height: 100vh; min-height: 100dvh; margin: 0 auto; background: var(--color-surface-muted); color: var(--color-text); }
.profile-nav { position: sticky; z-index: 2; top: 0; height: calc(58px + var(--app-top-safe-area)); padding: var(--app-top-safe-area) 12px 0; display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.back-button { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%; color: var(--color-text); }
.back-glyph { margin-top: -3px; font-size: 36px; font-weight: 300; line-height: 1; }
.back-button:active { background: var(--color-primary-soft); }
.nav-title { font-size: 18px; font-weight: 700; text-align: center; }
.profile-content { padding-bottom: calc(26px + env(safe-area-inset-bottom)); }
.profile-section { padding: 0 20px; background: var(--color-surface); }
.profile-section + .profile-section { margin-top: 10px; }
.profile-row { width: 100%; min-height: 68px; display: flex; align-items: center; gap: 10px; background: var(--color-surface); color: var(--color-text); text-align: left; }
.profile-row[role='button']:active { background: var(--color-primary-soft); }
.profile-row + .profile-row { border-top: 1px solid var(--color-border); }
.avatar-row { min-height: 94px; }
.row-label { flex: none; font-size: 16px; font-weight: 600; }
.row-value { min-width: 0; flex: 1; overflow: hidden; color: var(--color-text-muted); font-size: 15px; text-align: right; text-overflow: ellipsis; white-space: nowrap; }
.row-arrow { flex: none; color: var(--color-text-muted); font-size: 26px; font-weight: 300; line-height: 1; }
.profile-avatar { position: relative; width: 62px; height: 62px; margin-left: auto; overflow: hidden; border: 2px solid var(--color-surface); border-radius: 50%; background: var(--color-primary-soft); box-shadow: 0 2px 8px var(--color-shadow); }
.avatar-head { position: absolute; top: 11px; left: 50%; width: 21px; height: 21px; transform: translateX(-50%); border-radius: 50%; background: color-mix(in srgb, var(--color-primary) 28%, var(--color-surface)); }
.avatar-body { position: absolute; right: 10px; bottom: -7px; left: 10px; height: 34px; border-radius: 20px 20px 7px 7px; background: color-mix(in srgb, var(--color-primary) 28%, var(--color-surface)); }
.ip-row { padding-right: 2px; }
.info-button { flex: none; width: 36px; height: 44px; margin: 0 -8px 0 -2px; display: grid; place-items: center; color: var(--color-text-muted); }
.info-button span { width: 18px; height: 18px; display: grid; place-items: center; border: 1.5px solid currentColor; border-radius: 50%; font-size: 10px; font-weight: 700; font-style: normal; }
.back-button:focus-visible, .profile-row:focus-visible, .info-button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
@supports not (color: color-mix(in srgb, black, white)) { .avatar-head, .avatar-body { background: var(--color-primary); opacity: .28; } }
@media (max-width: 370px) { .profile-section { padding-right: 16px; padding-left: 16px; } .row-label { font-size: 15px; } .row-value { font-size: 14px; } }
</style>
