<script setup lang="ts">
import {computed,ref} from 'vue'
import FeaturePage from '../../components/FeaturePage.vue'
import BookRows from '../../library/BookRows.vue'
import {listLibrary} from '../../library/repository'
import {openFeature,useFeatureAction,useFeatureTask} from '../../features/useFeatureTask'
import type {BookSummary} from '../../library/types'
const books=ref<BookSummary[]>([]);const limit=ref(50);const visible=computed(()=>books.value.slice(0,limit.value))
const {actionError,perform}=useFeatureAction();const {loading,error,reload}=useFeatureTask(async()=>{books.value=(await listLibrary({limit:10000})).filter(book=>book.progress)})
function handleOpen(id:string):void{void perform(()=>openFeature(`/pages/book-detail/index?id=${encodeURIComponent(id)}`))}
</script>
<template><FeaturePage title="阅读记录" back-url="/pages/my-books/index" :loading="loading" :error="error" @retry="reload"><p class="feature-muted">按最近阅读时间排列 · {{ books.length }} 本</p><BookRows :books="visible" @item-click="handleOpen"/><p v-if="!books.length" class="feature-note">还没有阅读记录。打开一本书后，本机将自动保存位置。</p><button v-if="visible.length<books.length" role="button" class="feature-link" @click="limit+=50">加载更多记录</button><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p></FeaturePage></template>
