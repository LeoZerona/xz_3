<script setup lang="ts">
import {computed,ref,shallowRef} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import FeaturePage from '../../components/FeaturePage.vue'
import PdfTextBridge from '../reading/components/PdfTextBridge.vue'
import {readLibraryBook,readLibraryText} from '../../library/repository'
import {openFeature,useFeatureAction,useFeatureTask} from '../../features/useFeatureTask'
import type {PdfTextBridgeApi} from '../../reading/pdfTextBridge'
const id=ref('');const offset=ref(0);const query=ref('');const name=ref('');const text=ref('');const bridge=shallowRef<PdfTextBridgeApi|null>(null);const {actionError,perform}=useFeatureAction()
onLoad(options=>{id.value=typeof options?.id==='string'?options.id:'';offset.value=Number(options?.offset)||0;query.value=typeof options?.query==='string'?options.query:''})
const {loading,error,reload}=useFeatureTask(async()=>{name.value=(await readLibraryBook(id.value)).name;text.value=await readLibraryText(id.value,buffer=>{if(!bridge.value)throw new Error('PDF 解析器尚未就绪，请重试');return bridge.value.extract(buffer)});if(!Number.isInteger(offset.value)||offset.value<0||offset.value>text.value.length||query.value&&text.value.slice(offset.value,offset.value+query.value.length)!==query.value)throw new Error('原文位置已改变，请返回重新检索')})
const before=computed(()=>text.value.slice(Math.max(0,offset.value-400),offset.value));const match=computed(()=>text.value.slice(offset.value,offset.value+query.value.length));const after=computed(()=>text.value.slice(offset.value+query.value.length,offset.value+query.value.length+600))
function handleRead():void{void perform(()=>openFeature(`/pages/reading/index?id=${encodeURIComponent(id.value)}&offset=${offset.value}`))}
function handleExcerpt():void{void perform(()=>openFeature(`/pages/annotation-edit/index?id=${encodeURIComponent(id.value)}&kind=excerpt&start=${offset.value}&end=${offset.value+Math.max(1,query.value.length)}`))}
</script>
<template><FeaturePage title="原文上下文" back-url="/pages/content-results/index" :loading="loading" :error="error" @retry="reload"><h2>{{ name }}</h2><p class="feature-muted">命中位置 {{ offset }} · 展示前后相邻原文</p><p class="context-text">{{ before }}<mark>{{ match }}</mark>{{ after }}</p><button role="button" class="feature-button secondary" @click="handleExcerpt">把命中片段保存为摘录</button><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p><template #footer><button role="button" class="feature-button" @click="handleRead">在阅读器中打开这个位置</button></template></FeaturePage><PdfTextBridge ref="bridge"/></template>
<style scoped>.context-text { margin:24px 0;font-size:16px;line-height:2;white-space:pre-wrap;overflow-wrap:anywhere; }.context-text mark { background:var(--color-primary-soft);color:var(--color-primary);padding:2px; }</style>
