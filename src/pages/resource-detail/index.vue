<script setup lang="ts">
import {ref} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import FeaturePage from '../../components/FeaturePage.vue'
import {readResourceStatus,repairCatalogResources,probeFont,recoverFontFallback} from '../../profile/resources'
import {confirmFeature,useFeatureAction,useFeatureTask} from '../../features/useFeatureTask'
const kind=ref('catalog');const id=ref('');const status=ref('');const {busy,actionError,perform}=useFeatureAction();onLoad(options=>{kind.value=options?.kind==='font'?'font':'catalog';id.value=typeof options?.id==='string'?options.id:''})
const {loading,error,reload}=useFeatureTask(async()=>{if(kind.value==='font'){try{status.value=await probeFont(id.value);actionError.value=''}catch(cause){status.value='字体未能读取，可以重试或启用可读内置字体回退。';actionError.value=cause instanceof Error?cause.message:'字体读取失败'}}else{const data=await readResourceStatus();status.value=`本机收录 ${data.characters} 字，共 ${data.levels} 个关卡。标准字表为一级3500、二级3000、三级1605字。`}})
function handleRepair():void{void perform(async()=>{if(!await confirmFeature('恢复内置课程资源？','重新读取应用字库并替换课程内容表。个人学习、收藏、书籍和笔记保留。','恢复资源'))return;await repairCatalogResources();await reload();status.value+=' 已从内置来源恢复。'})}
function handleFallback():void{void perform(async()=>{status.value='已检查并启用可读的内置字体：'+await recoverFontFallback()})}
</script>
<template><FeaturePage :title="kind==='font'?'字体资源检查':'课程资源检查'" back-url="/pages/resources/index" :loading="loading" :error="error" @retry="reload"><p class="feature-note" role="status">{{ status }}</p><template v-if="kind==='font'"><p class="feature-muted">文件读取成功不等于覆盖所有汉字。某个文字缺少字形时，请换用有该字形的字体，不会生成不存在的篆书字形。</p><button role="button" class="feature-button secondary" :disabled="busy" @click="reload">重试读取字体文件</button><button role="button" class="feature-button" :disabled="busy" @click="handleFallback">使用可读内置字体回退</button></template><template v-else><p class="feature-muted">二三级来自 Unicode 标准序号与公开字典固定快照。无可靠释义、结构或说文资料时明确显示未收录。</p><button role="button" class="feature-button" :disabled="busy" @click="handleRepair">恢复内置字库资源</button></template><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p></FeaturePage></template>
