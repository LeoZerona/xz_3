<script setup lang="ts">
import {ref} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import FeaturePage from '../../components/FeaturePage.vue'
import FeatureTextField from '../../components/FeatureTextField.vue'
import {readLibraryBook,renameBook,setBookStatus,deleteBookWithRelations} from '../../library/repository'
import {confirmFeature,goFeatureBack,openFeature,useFeatureAction,useFeatureTask} from '../../features/useFeatureTask'
import type {BookSummary,BookStatus} from '../../library/types'
const id=ref('');const book=ref<BookSummary>();const name=ref('');const {busy,actionError,perform}=useFeatureAction()
onLoad(options=>{id.value=typeof options?.id==='string'?options.id:''})
const {loading,error,reload}=useFeatureTask(async()=>{book.value=await readLibraryBook(id.value);name.value=book.value.name})
function handleOpen(path:string):void{void perform(()=>openFeature(`${path}?id=${encodeURIComponent(id.value)}`))}
function handleStatus(status:BookStatus):void{void perform(async()=>{await setBookStatus(id.value,status);await reload()})}
function handleRename():void{void perform(async()=>{await renameBook(id.value,name.value);await reload()})}
function handleDelete():void{void perform(async()=>{if(!await confirmFeature('删除这本图书？','将同时删除本书正文、阅读位置、书签和笔记。学习记录保留。','删除图书'))return;await deleteBookWithRelations(id.value);await goFeatureBack('/pages/my-books/index')})}
</script>
<template><FeaturePage title="图书详情" back-url="/pages/my-books/index" :loading="loading" :error="error" @retry="reload"><template v-if="book"><div class="feature-hero"><p class="feature-muted">{{ book.source==='custom'?'我的导入':'内置资料' }} · {{ book.ext.toUpperCase() }}</p><h2>{{ book.name }}</h2><p class="feature-muted">{{ book.annotationCount }} 条书签笔记 · {{ book.progress ? `上次读到第${book.progress.page}页` : '尚无阅读记录' }}</p></div><h2 class="feature-section-title">阅读状态</h2><div class="feature-actions"><button v-for="item in ([{id:'unread',name:'未读'},{id:'reading',name:'在读'},{id:'finished',name:'已读完'}] as const)" :key="item.id" role="radio" class="feature-button secondary" :aria-checked="book.status===item.id" :disabled="busy" @click="handleStatus(item.id)">{{ item.name }}{{ book.status===item.id?' ✓':'' }}</button></div><button role="button" class="feature-row" @click="handleOpen('/pages/bookmarks/index')"><span class="feature-row-copy">本书书签、摘录和笔记</span><span>→</span></button><button role="button" class="feature-row" @click="handleOpen('/pages/excerpt-workspace/index')"><span class="feature-row-copy">原文摘录工作台</span><span>→</span></button><template v-if="book.source==='custom'"><h2 class="feature-section-title">重命名图书</h2><FeatureTextField v-model="name" label="图书名称" :maxlength="160"/><button role="button" class="feature-button secondary" :disabled="busy||name===book.name" @click="handleRename">保存书名</button><button role="button" class="feature-link" :disabled="busy" @click="handleDelete">删除本书及关联笔记</button></template><p v-else class="feature-note">内置资料随应用分发，名称固定，可为它保存阅读状态、书签和摘录。</p></template><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p><template #footer><button role="button" class="feature-button" :disabled="busy" @click="handleOpen('/pages/reading/index')">继续阅读原文</button></template></FeaturePage></template>
