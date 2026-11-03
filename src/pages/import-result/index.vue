<script setup lang="ts">
import {ref} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import FeaturePage from '../../components/FeaturePage.vue'
import {readImportResult} from '../../library/importer'
import {openFeature,useFeatureAction,useFeatureTask} from '../../features/useFeatureTask'
import type {ImportResult} from '../../library/importer'
const id=ref('');const result=ref<ImportResult>();const {actionError,perform}=useFeatureAction();onLoad(options=>{id.value=typeof options?.id==='string'?options.id:''})
const {loading,error,reload}=useFeatureTask(async()=>{result.value=await readImportResult(id.value)})
function handleOpen(path:string):void{void perform(()=>openFeature(`${path}?id=${encodeURIComponent(result.value?.bookId??'')}`))}
</script>
<template><FeaturePage title="导入结果" back-url="/pages/my-books/index" :loading="loading" :error="error" @retry="reload"><template v-if="result"><div class="feature-hero"><p class="feature-muted">已成功导入到本机</p><h2>{{ result.fileName }}</h2><p>{{ result.characters.toLocaleString() }} 个正文字符</p></div><p class="feature-note">正文、书籍信息与全文检索索引已在同一事务中保存，可离线阅读并纳入备份。原始 PDF 文件不包含在备份中，保存的是已提取正文。</p><div class="feature-actions"><button role="button" class="feature-button secondary" @click="handleOpen('/pages/book-detail/index')">管理这本图书</button><button role="button" class="feature-button secondary" @click="handleOpen('/pages/excerpt-workspace/index')">摘录与笔记</button></div></template><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p><template #footer><button role="button" class="feature-button" @click="handleOpen('/pages/reading/index')">开始阅读</button></template></FeaturePage></template>
