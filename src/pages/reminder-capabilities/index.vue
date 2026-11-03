<script setup lang="ts">
import FeaturePage from '../../components/FeaturePage.vue'
import NotificationView from '../../notifications/NotificationView.vue'
import {useNotificationPage} from '../../notifications/useNotificationPage'
const state=useNotificationPage('capabilities')
</script>
<template><FeaturePage :title="state.title" :loading="state.loading" :error="state.error" :before-back="state.confirmDiscard" @retry="state.reload"><NotificationView :state="state"/><template v-if="state.kind==='edit'" #footer><button role="button" class="feature-button" :disabled="state.busy" @click="state.handleSave">保存应用内提醒</button></template></FeaturePage></template>
