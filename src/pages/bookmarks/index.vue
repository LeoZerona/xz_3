<script setup lang="ts">
import {computed,ref,shallowRef} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import FeaturePage from '../../components/FeaturePage.vue'
import FeatureTextField from '../../components/FeatureTextField.vue'
import PdfTextBridge from '../reading/components/PdfTextBridge.vue'
import {listLibrary,readLibraryText} from '../../library/repository'
import {checkAnnotation,deleteAnnotation,listAnnotations} from '../../library/annotations'
import {confirmFeature,openFeature,useFeatureAction,useFeatureTask} from '../../features/useFeatureTask'
import type {Annotation,BookSummary} from '../../library/types'
import type {PdfTextBridgeApi} from '../../reading/pdfTextBridge'
const id=ref('');const query=ref('');const kind=ref('');const limit=ref(50);const items=ref<Annotation[]>([]);const books=ref<BookSummary[]>([]);const bridge=shallowRef<PdfTextBridgeApi|null>(null)
const {busy,actionError,perform}=useFeatureAction()
onLoad(options=>{id.value=typeof options?.id==='string'?options.id:''})
const {loading,error,reload}=useFeatureTask(async()=>{items.value=await listAnnotations(id.value||undefined);books.value=await listLibrary({limit:10000})})
const filtered=computed(()=>items.value.filter(item=>(!kind.value||item.kind===kind.value)&&(!query.value.trim()||`${item.quote} ${item.note} ${item.tags.join(' ')}`.includes(query.value.trim()))))
function bookName(bookId:string):string{return books.value.find(book=>book.id===bookId)?.name??'原书籍已不存在'}
function handleOpen(url:string):void{void perform(()=>openFeature(url))}
function handleJump(item:Annotation):void{void perform(async()=>{const text=await readLibraryText(item.bookId,buffer=>{if(!bridge.value)throw new Error('PDF 解析器尚未就绪，请重试');return bridge.value.extract(buffer)});if(checkAnnotation(item,text)!=='valid')throw new Error('原文已改变，无法可靠定位。笔记和摘录仍保留，可复制后重新建立锚点。');await openFeature(`/pages/reading/index?id=${encodeURIComponent(item.bookId)}&offset=${item.startOffset}`)})}
function handleDelete(item:Annotation):void{void perform(async()=>{if(!await confirmFeature('删除这条书签或摘录？','只删除本条笔记，原文与阅读位置保留。','删除'))return;await deleteAnnotation(item.id);await reload()})}
function handleCopy(item:Annotation):void{void perform(()=>new Promise<void>((resolve,reject)=>uni.setClipboardData({data:`《${bookName(item.bookId)}》\n${item.quote}\n${item.note}\n${item.tags.join(' ')}`,success:()=>resolve(),fail:()=>reject(new Error('复制失败，请重试'))})))}
</script>
<template><FeaturePage title="书签、摘录与笔记" back-url="/pages/my-books/index" :loading="loading" :error="error" @retry="reload"><FeatureTextField v-model="query" label="搜索摘录笔记或标签" hide-label/><div class="feature-filter-line"><select v-model="kind" aria-label="笔记类型"><option value="">全部类型</option><option value="bookmark">书签</option><option value="excerpt">摘录</option></select><span class="feature-muted">{{ filtered.length }} 条</span></div><section v-for="item in filtered.slice(0,limit)" :key="item.id" class="annotation-card"><p class="feature-muted">{{ item.kind==='bookmark'?'书签':'摘录' }} · {{ bookName(item.bookId) }} · {{ new Date(item.updatedAt).toLocaleDateString() }}</p><blockquote>{{ item.quote }}</blockquote><p class="annotation-note">{{ item.note||'尚无笔记' }}</p><p class="feature-muted">{{ item.tags.join(' · ') }}</p><div class="feature-actions"><button role="button" class="feature-link" :disabled="busy" @click="handleJump(item)">回到原文</button><button role="button" class="feature-link" @click="handleOpen(`/pages/annotation-edit/index?id=${encodeURIComponent(item.bookId)}&annotation=${encodeURIComponent(item.id)}`)">编辑笔记</button><button role="button" class="feature-link" @click="handleCopy(item)">复制摘录</button><button role="button" class="feature-link" @click="handleDelete(item)">删除本条</button></div></section><p v-if="!filtered.length" class="feature-note">这里还没有内容。进入图书详情，在原文摘录工作台保存片段，或在当前阅读位置建立书签。</p><button v-if="filtered.length>limit" role="button" class="feature-link" @click="limit+=50">加载更多笔记</button><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p><template v-if="id" #footer><button role="button" class="feature-button" @click="handleOpen(`/pages/annotation-edit/index?id=${encodeURIComponent(id)}`)">在当前阅读位置添加书签</button></template></FeaturePage><PdfTextBridge ref="bridge"/></template>
<style scoped>.annotation-card { padding:18px 0;border-bottom:1px solid var(--color-border); }.annotation-card blockquote { margin:14px 0;padding-left:12px;border-left:2px solid var(--color-primary);font-size:15px;line-height:1.9;white-space:pre-wrap;overflow-wrap:anywhere; }.annotation-note { font-size:14px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere; }</style>
