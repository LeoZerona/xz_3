<script setup lang="ts">
import {computed,ref,shallowRef} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import FeaturePage from '../../components/FeaturePage.vue'
import FeatureTextField from '../../components/FeatureTextField.vue'
import PdfTextBridge from '../reading/components/PdfTextBridge.vue'
import {readLibraryBook,readLibraryText} from '../../library/repository'
import {checkAnnotation,listAnnotations,rawOffsetForRendered,saveAnnotation} from '../../library/annotations'
import {confirmFeature,finishFeatureEdit,useFeatureAction,useFeatureTask} from '../../features/useFeatureTask'
import type {PdfTextBridgeApi} from '../../reading/pdfTextBridge'
const bookId=ref('');const annotationId=ref('');const name=ref('');const text=ref('');const kind=ref<'bookmark'|'excerpt'>('bookmark');const start=ref('0');const end=ref('0');const note=ref('');const tags=ref('');const original=ref('');const bridge=shallowRef<PdfTextBridgeApi|null>(null)
const {busy,actionError,perform}=useFeatureAction()
onLoad(options=>{bookId.value=typeof options?.id==='string'?options.id:'';annotationId.value=typeof options?.annotation==='string'?options.annotation:'';kind.value=options?.kind==='excerpt'?'excerpt':'bookmark';start.value=typeof options?.start==='string'?options.start:'0';end.value=typeof options?.end==='string'?options.end:'0'})
const value=computed(()=>JSON.stringify([start.value,end.value,note.value,tags.value]))
const quote=computed(()=>text.value.slice(Number(start.value),Number(end.value)))
const {loading,error,reload}=useFeatureTask(async()=>{
  const book=await readLibraryBook(bookId.value);name.value=book.name;text.value=await readLibraryText(bookId.value,buffer=>{if(!bridge.value)throw new Error('PDF 解析器尚未就绪，请重试');return bridge.value.extract(buffer)})
  if(annotationId.value){const item=(await listAnnotations(bookId.value)).find(entry=>entry.id===annotationId.value);if(!item)throw new Error('书签或笔记已不存在');if(checkAnnotation(item,text.value)!=='valid')throw new Error('原文已改变，原笔记仍保留，请返回书签列表复制内容或重新定位');kind.value=item.kind;start.value=String(item.startOffset);end.value=String(item.endOffset);note.value=item.note;tags.value=item.tags.join('，')}
  else if(end.value==='0'){const offset=rawOffsetForRendered(text.value,book.progress?.characterOffset??0);start.value=String(offset);end.value=String(Math.min(text.value.length,offset+40))}
  original.value=value.value
},{refreshOnShow:false,beforeBack:confirmDiscard,backUrl:'/pages/my-books/index'})
function confirmDiscard():Promise<boolean>{if(busy.value)return Promise.resolve(false);return original.value&&original.value!==value.value?confirmFeature('放弃未保存笔记？','本次编辑不会保存，原有书签与笔记保留。','放弃修改'):Promise.resolve(true)}
function handleSave():void{void perform(async()=>{await saveAnnotation({id:annotationId.value||undefined,bookId:bookId.value,kind:kind.value,startOffset:Number(start.value),endOffset:Number(end.value),text:text.value,note:note.value,tags:tags.value.split(/[,，\s]+/)});original.value=value.value;await finishFeatureEdit(`/pages/bookmarks/index?id=${encodeURIComponent(bookId.value)}`)})}
</script>
<template><FeaturePage :title="kind==='bookmark'?'书签与笔记':'摘录与笔记'" back-url="/pages/my-books/index" :loading="loading" :error="error" :before-back="confirmDiscard" @retry="reload"><h2>{{ name }}</h2><div class="feature-filter-line"><FeatureTextField v-model="start" label="原文起点" type="number"/><FeatureTextField v-model="end" label="原文终点" type="number"/></div><blockquote class="feature-note">{{ quote || '请填写有效的原文范围' }}</blockquote><FeatureTextField v-model="note" label="我的笔记" :maxlength="5000" multiline placeholder="记录理解、疑问或关联文字"/><FeatureTextField v-model="tags" label="标签（逗号分隔）" placeholder="例如：诗词，阅读生字"/><p class="feature-muted">{{ kind==='bookmark'?'书签保留原文位置，可附加笔记。':'摘录保留原文片段及位置。' }}内容只保存到本机，并进入数据备份。</p><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p><template #footer><button role="button" class="feature-button" :disabled="busy" @click="handleSave">保存{{ kind==='bookmark'?'书签':'摘录' }}与笔记</button></template></FeaturePage><PdfTextBridge ref="bridge"/></template>
