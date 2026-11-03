<script setup lang="ts">
import {computed,ref,shallowRef} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import FeaturePage from '../../components/FeaturePage.vue'
import FeatureTextField from '../../components/FeatureTextField.vue'
import PdfTextBridge from '../reading/components/PdfTextBridge.vue'
import {readLibraryBook,readLibraryText} from '../../library/repository'
import {openFeature,useFeatureAction,useFeatureTask} from '../../features/useFeatureTask'
import type {PdfTextBridgeApi} from '../../reading/pdfTextBridge'
const id=ref('');const name=ref('');const text=ref('');const page=ref(0);const query=ref('');const bridge=shallowRef<PdfTextBridgeApi|null>(null)
const {busy,actionError,perform}=useFeatureAction()
onLoad(options=>{id.value=typeof options?.id==='string'?options.id:''})
const {loading,error,reload}=useFeatureTask(async()=>{name.value=(await readLibraryBook(id.value)).name;text.value=await readLibraryText(id.value,buffer=>{if(!bridge.value)throw new Error('PDF 解析器尚未就绪，请重试');return bridge.value.extract(buffer)})})
const segments=computed(()=>{const result:Array<{start:number;end:number;text:string}>=[];for(let start=0;start<text.value.length;){let end=Math.min(text.value.length,start+250);if(/[\uDC00-\uDFFF]/.test(text.value[end]??''))end++;result.push({start,end,text:text.value.slice(start,end)});start=end}return result})
const visible=computed(()=>segments.value.slice(page.value*8,page.value*8+8))
function handleEdit(start:number,end:number,kind:'bookmark'|'excerpt'):void{void perform(()=>openFeature(`/pages/annotation-edit/index?id=${encodeURIComponent(id.value)}&kind=${kind}&start=${start}&end=${end}`))}
function handleFind():void{const at=text.value.indexOf(query.value);if(!query.value.trim()||at<0){actionError.value='原文中没有找到这段文字';return};page.value=Math.floor(segments.value.findIndex(segment=>segment.start<=at&&segment.end>at)/8)}
</script>
<template><FeaturePage title="原文摘录工作台" back-url="/pages/my-books/index" :loading="loading" :error="error" @retry="reload"><h2>{{ name }}</h2><p class="feature-note">按原文位置保存摘录和笔记，改变阅读器排版后仍可定位。每段最多 250 字符，可在编辑页细调范围。</p><FeatureTextField v-model="query" label="查找原文片段"/><button role="button" class="feature-link" @click="handleFind">定位包含这段文字的位置</button><section v-for="segment in visible" :key="segment.start" class="excerpt-segment"><p class="feature-muted">原文位置 {{ segment.start }}–{{ segment.end }}</p><p class="excerpt-text">{{ segment.text }}</p><div class="feature-actions"><button role="button" class="feature-button secondary" :disabled="busy" @click="handleEdit(segment.start,segment.end,'excerpt')">摘录本段</button><button role="button" class="feature-button secondary" :disabled="busy" @click="handleEdit(segment.start,Math.min(segment.start+40,segment.end),'bookmark')">在此加书签</button></div></section><div class="feature-actions"><button role="button" class="feature-button secondary" :disabled="page===0" @click="page--">上一组原文</button><button role="button" class="feature-button secondary" :disabled="(page+1)*8>=segments.length" @click="page++">下一组原文</button></div><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p></FeaturePage><PdfTextBridge ref="bridge"/></template>
<style scoped>.excerpt-segment { padding:18px 0;border-bottom:1px solid var(--color-border); }.excerpt-text { font-size:16px;line-height:2;white-space:pre-wrap;overflow-wrap:anywhere; }</style>
