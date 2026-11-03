<script setup lang="ts">
import {ref} from 'vue'
import FeaturePage from '../../components/FeaturePage.vue'
import {clearOfflineCache,prepareOffline,readOfflineStatus} from '../../offline/client'
import type {OfflineStatus} from '../../offline/client'
import {confirmFeature,useFeatureAction,useFeatureTask} from '../../features/useFeatureTask'
const state=ref<OfflineStatus>();const status=ref('');const {busy,actionError,perform}=useFeatureAction();const {loading,error,reload}=useFeatureTask(async()=>{state.value=await readOfflineStatus()})
function handlePrepare():void{void perform(async()=>{status.value='正在下载并校验整套资源，请保持页面打开…';try{state.value=await prepareOffline()}finally{status.value=''}})}
function handleClear():void{void perform(async()=>{if(!await confirmFeature('清理离线启动资源？','会保留用户数据库。清理后重新打开 H5 需要网络，当前离线时请谨慎。','确认清理'))return;await clearOfflineCache();state.value=await readOfflineStatus();status.value='离线启动缓存已清理，用户数据库保留'})}
</script>
<template><FeaturePage title="H5 离线资源" :loading="loading" :error="error" @retry="reload"><h2 class="feature-section-title">{{ state?.ready?'当前资源已可离线启动':'离线启动尚未准备' }}</h2><p class="feature-note">{{ state?.reason }}</p><template v-if="state?.ready"><div class="feature-row"><span class="feature-row-copy">已校验资源</span><span>{{ state.files }} 项</span></div><p class="feature-muted">准备时间：{{ state.preparedAt }}<br/>资源版本：{{ state.version }}</p></template><p class="feature-note">准备需要下载课程、页面与所选字体，可能消耗数十 MB。自定义图书正文已在数据库中；内置图书请先在线打开。切换未缓存字体或清除网站数据后需要重新准备。浏览器存储回收也可能移除缓存，请保留备份。</p><button v-if="state?.supported" role="button" class="feature-button" :disabled="busy" @click="handlePrepare">准备离线启动资源</button><button role="button" class="feature-link" :disabled="busy" @click="reload">刷新资源状态</button><button v-if="state?.supported" role="button" class="feature-link" :disabled="busy" @click="handleClear">清理离线启动缓存</button><p v-if="status" class="feature-note" role="status">{{ status }}</p><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p></FeaturePage></template>
