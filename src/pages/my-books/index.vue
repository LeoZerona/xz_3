<script setup lang="ts">
import {ref,watch} from 'vue'
import FeaturePage from '../../components/FeaturePage.vue'
import FeatureTextField from '../../components/FeatureTextField.vue'
import BookRows from '../../library/BookRows.vue'
import {listLibrary} from '../../library/repository'
import {openFeature,useFeatureAction,useFeatureTask} from '../../features/useFeatureTask'
import type {BookSummary} from '../../library/types'
const query=ref('');const source=ref('');const status=ref('');const sort=ref<'name'|'recent'>('recent');const pageSize=ref(50);const books=ref<BookSummary[]>([])
const {actionError,perform}=useFeatureAction()
const {loading,error,reload}=useFeatureTask(async()=>{books.value=await listLibrary({query:query.value,source:source.value,status:status.value,sort:sort.value,limit:pageSize.value})})
watch([query,source,status,sort],()=>{pageSize.value=50;void reload()})
function handleOpen(url:string):void{void perform(()=>openFeature(url))}
function handleMore():void{pageSize.value+=50;void reload()}
</script>
<template><FeaturePage title="我的图书" :loading="loading" :error="error" @retry="reload"><FeatureTextField v-model="query" label="搜索图书名称" hide-label/><div class="feature-filter-line"><select v-model="source" aria-label="图书来源"><option value="">全部来源</option><option value="builtin">内置资料</option><option value="custom">我的导入</option></select><select v-model="status" aria-label="阅读状态"><option value="">全部状态</option><option value="unread">未读</option><option value="reading">在读</option><option value="finished">已读完</option></select><select v-model="sort" aria-label="图书排序"><option value="recent">最近阅读</option><option value="name">书名</option></select></div><BookRows :books="books" @item-click="handleOpen(`/pages/book-detail/index?id=${encodeURIComponent($event)}`)"/><p v-if="!books.length" class="feature-note">当前范围没有图书，可导入自己的 TXT 或 PDF 资料。</p><button v-if="books.length>=pageSize" role="button" class="feature-link" @click="handleMore">加载更多图书</button><div class="feature-actions"><button role="button" class="feature-button secondary" @click="handleOpen('/pages/bookmarks/index')">全部书签摘录</button><button role="button" class="feature-button secondary" @click="handleOpen('/pages/reading-history/index')">阅读记录</button></div><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p><template #footer><button role="button" class="feature-button" @click="handleOpen('/pages/book-import/index')">导入图书资料</button></template></FeaturePage></template>
