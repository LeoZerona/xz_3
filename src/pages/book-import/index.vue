<script setup lang="ts">
import {onBeforeUnmount,onMounted,ref,shallowRef} from 'vue'
import FeaturePage from '../../components/FeaturePage.vue'
import FeatureTextField from '../../components/FeatureTextField.vue'
import PdfTextBridge from '../reading/components/PdfTextBridge.vue'
import {getDatabase} from '../../database/connection'
import {DuplicateDocumentError,importDocument} from '../../library/importer'
import {openFeature,useFeatureAction,useFeatureTask} from '../../features/useFeatureTask'
import type {PdfTextBridgeApi} from '../../reading/pdfTextBridge'
const name=ref('学习资料.txt');const text=ref('');const file=shallowRef<File|null>(null);const mode=ref<'text'|'file'>('text');const status=ref('');const duplicate=ref('');const history=ref<Array<{id:string;fileName:string;at:string}>>([]);const bridge=shallowRef<PdfTextBridgeApi|null>(null)
let controller:AbortController|undefined
let fileInput:HTMLInputElement|undefined
let canChooseFile=false
// #ifdef H5
canChooseFile=true
// #endif
const {busy,actionError,perform}=useFeatureAction();const {loading,error,reload}=useFeatureTask(async()=>{history.value=(await(await getDatabase()).query('import_history',{orderBy:'at',descending:true,limit:20})).map(row=>({id:row.id,fileName:String(row.fileName),at:String(row.at)}))},{refreshOnShow:false,beforeBack:async()=>!busy.value})
function handlePicked(event:Event):void{const selected=(event.target as HTMLInputElement).files?.[0];if(selected){if(selected.size>20*1024*1024){actionError.value='文件不能超过 20MB';return};file.value=selected;name.value=selected.name;status.value='文件已选择，点击导入后开始解析'}}
onMounted(()=>{
  // #ifdef H5
  fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='.txt,.pdf';fileInput.style.display='none';fileInput.setAttribute('aria-label','选择本地TXT或PDF');fileInput.addEventListener('change',handlePicked);document.body.appendChild(fileInput)
  // #endif
})
function handleChoose():void{fileInput?.click()}
function handleOpen(url:string):void{void perform(()=>openFeature(url))}
function handleImport():void{void perform(async()=>{controller=new AbortController();duplicate.value='';status.value='正在读取和解析…';try{const buffer=mode.value==='file'?await file.value?.arrayBuffer():undefined;if(mode.value==='file'&&!buffer)throw new Error('请先选择 TXT 或 PDF 文件');const result=await importDocument({fileName:name.value,text:mode.value==='text'?text.value:undefined,buffer,signal:controller.signal,extractPdfText:buffer=>{if(!bridge.value)throw new Error('PDF 解析器尚未就绪，请重试');return bridge.value.extract(buffer)}});status.value='导入完成，正文与检索索引已保存';await openFeature(`/pages/import-result/index?id=${encodeURIComponent(result.id)}`,true)}catch(cause){status.value='本次导入未完成，未保存半本书';if(cause instanceof DuplicateDocumentError)duplicate.value=cause.bookId;throw cause}finally{controller=undefined}})}
onBeforeUnmount(()=>{controller?.abort();fileInput?.removeEventListener('change',handlePicked);fileInput?.remove()})
</script>
<template><FeaturePage title="导入中心" back-url="/pages/my-books/index" :loading="loading" :error="error" :before-back="async()=>!busy" @retry="reload"><div class="feature-tabs"><button role="tab" class="feature-tab" :class="{active:mode==='text'}" :aria-selected="mode==='text'" :disabled="busy" @click="mode='text'">粘贴 TXT 正文</button><button v-if="canChooseFile" role="tab" class="feature-tab" :class="{active:mode==='file'}" :aria-selected="mode==='file'" :disabled="busy" @click="mode='file'">选择 TXT / PDF</button></div><FeatureTextField v-model="name" label="资料文件名（含 .txt 或 .pdf）" :disabled="busy"/><FeatureTextField v-if="mode==='text'" v-model="text" label="资料正文" :maxlength="5000000" multiline :disabled="busy" placeholder="粘贴要离线阅读的文字"/><label v-else class="feature-field"><span>选择本地资料（最大 20MB）</span><button role="button" class="feature-button secondary" :disabled="busy" @click="handleChoose">{{ file ? file.name : '选择文件…' }}</button></label><p class="feature-note">TXT 支持现有编码识别；PDF 仅提取文字，不保留原版式。扫描图片 PDF 需先转成文字。取消或解析失败不会留下半本书。</p><p v-if="!canChooseFile" class="feature-note">当前 App 环境可粘贴正文导入。也可在支持文件选择的 H5 环境导入 PDF，再通过备份迁移到本机。</p><p v-if="status" class="feature-note" role="status">{{ status }}</p><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p><button v-if="duplicate" role="button" class="feature-link" @click="handleOpen(`/pages/book-detail/index?id=${encodeURIComponent(duplicate)}`)">打开已存在的图书</button><button v-if="busy" role="button" class="feature-link" @click="controller?.abort()">取消本次导入</button><h2 class="feature-section-title">最近导入</h2><button v-for="item in history" :key="item.id" role="button" class="feature-row" @click="handleOpen(`/pages/import-result/index?id=${encodeURIComponent(item.id)}`)"><span class="feature-row-copy">{{ item.fileName }}</span><span class="feature-muted">{{ item.at.slice(0,10) }} →</span></button><p v-if="!history.length" class="feature-muted">暂无成功导入记录。</p><template #footer><button role="button" class="feature-button" :disabled="busy" @click="handleImport">{{ busy?'正在解析并保存…':'导入到本机书库' }}</button></template></FeaturePage><PdfTextBridge ref="bridge"/></template>
