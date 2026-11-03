<script setup lang="ts">
import FeaturePage from '../../components/FeaturePage.vue'
import DataView from '../../data-management/DataView.vue'
import {useDataPage} from '../../data-management/useDataPage'
const state=useDataPage('data')
</script>
<template><FeaturePage :title="state.title" :loading="state.loading" :error="state.error" :before-back="state.confirmDiscard" @retry="state.reload"><DataView :state="state"/></FeaturePage></template>
