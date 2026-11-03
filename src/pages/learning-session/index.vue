<script setup lang="ts">
import FeaturePage from '../../components/FeaturePage.vue'
import LearningHistoryView from '../../learning/LearningHistoryView.vue'
import { useHistoryPage } from '../../learning/useHistoryPage'
const { title, actionError, loading, error, reload, history, characters, date, month, monthLabel, rangeDays, sessionId, handleOpen, handleMonth, handleRange } = useHistoryPage('session')
</script>
<template>
  <FeaturePage :title="title" back-url="/pages/learning-records/index" :loading="loading" :error="error" @retry="reload">
    <LearningHistoryView v-if="history" kind="session" :history="history" :characters="characters" :date="date" :month="month" :month-label="monthLabel" :range-days="rangeDays" :session-id="sessionId" @open="handleOpen" @month-change="handleMonth" @range-change="handleRange" />
    <p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p>
  </FeaturePage>
</template>
