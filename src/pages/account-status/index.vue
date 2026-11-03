<script setup lang="ts">
import {ref} from 'vue'
import FeaturePage from '../../components/FeaturePage.vue'
import {useLocalIdentity} from '../../profile/identity'
import {openFeature,useFeatureAction,useFeatureTask} from '../../features/useFeatureTask'
const identity=useLocalIdentity();const status=ref('');const {actionError,perform}=useFeatureAction();const {loading,error,reload}=useFeatureTask(async()=>{status.value='当前没有登录服务端账号'})
function handleOpen(url:string):void{void perform(()=>openFeature(url))}
</script>
<template><FeaturePage title="本机档案与账号状态" :loading="loading" :error="error" @retry="reload"><div class="feature-hero"><p class="feature-muted">离线个人学习</p><h2>本机档案</h2><p class="feature-note">{{ status }}。个人资料、学习与阅读记录保存在这份本机档案中，账号登录和云同步尚未接入。</p></div><div class="feature-row"><span class="feature-row-copy">档案 ID</span><strong>{{ identity }}</strong></div><p class="feature-muted">此 ID 由应用在本地创建，不读取手机硬件标识。恢复备份时随档案一起恢复。</p><button role="button" class="feature-row" @click="handleOpen('/pages/personal-profile/index')"><span class="feature-row-copy">编辑本机个人资料</span><span>→</span></button><button role="button" class="feature-row" @click="handleOpen('/pages/data-privacy/index')"><span class="feature-row-copy">备份、迁移与数据管理</span><span>→</span></button><button role="button" class="feature-row" @click="handleOpen('/pages/resources/index')"><span class="feature-row-copy">资源状态与恢复</span><span>→</span></button><p class="feature-note">退出登录入口不会清除这份离线学习档案。清理或恢复数据请到数据管理页确认范围。</p><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p></FeaturePage></template>
