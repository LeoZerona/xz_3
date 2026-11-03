<script setup lang="ts">
import {ref} from 'vue'
import FeaturePage from '../../components/FeaturePage.vue'
import FeatureTextField from '../../components/FeatureTextField.vue'
import ContentSearchPanel from '../../library/ContentSearchPanel.vue'
import {openFeature,useFeatureAction,useFeatureTask} from '../../features/useFeatureTask'
import type {ContentMode} from '../../library/search'
const query=ref('');const mode=ref<ContentMode>('sentence');const {actionError,perform}=useFeatureAction();useFeatureTask(async()=>{})
function handleOpen(url:string):void{void perform(()=>openFeature(url))}
</script>
<template><FeaturePage title="本机内容检索"><FeatureTextField v-model="query" label="搜索词语或原文" hide-label/><div class="feature-tabs"><button v-for="item in ([{id:'word',label:'词语'},{id:'sentence',label:'句子'},{id:'article',label:'文章'}] as const)" :key="item.id" role="tab" class="feature-tab" :class="{active:mode===item.id}" :aria-selected="mode===item.id" @click="mode=item.id">{{ item.label }}</button></div><ContentSearchPanel :query="query" :mode="mode" @open="handleOpen"/><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p></FeaturePage></template>
