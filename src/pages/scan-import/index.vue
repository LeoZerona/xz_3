<script setup lang="ts">
import {ref,watch} from 'vue'
import FeaturePage from '../../components/FeaturePage.vue'
import FeatureTextField from '../../components/FeatureTextField.vue'
import CharacterRows from '../../collections/CharacterRows.vue'
import {parseImportCode} from '../../profile/importCode'
import {findCharactersByText} from '../../database/catalog'
import {saveCollection} from '../../collections/repository'
import {openFeature,useFeatureAction,useFeatureTask} from '../../features/useFeatureTask'
import type {StudyCharacterEntry} from '../../study/types'
const text=ref('');const name=ref('导入字单');const entries=ref<StudyCharacterEntry[]>([]);const missing=ref<string[]>([]);const hasPreview=ref(false);const {busy,actionError,perform}=useFeatureAction();const {loading,error,reload}=useFeatureTask(async()=>{hasPreview.value=false},{refreshOnShow:false})
watch(text,()=>{hasPreview.value=false;entries.value=[];missing.value=[]})
async function preview():Promise<void>{const input=parseImportCode(text.value);name.value=input.name;const found=await findCharactersByText(input.characters);entries.value=found.entries;missing.value=found.missing;hasPreview.value=true}
function handlePreview():void{void perform(preview)}
function handleScan():void{void perform(async()=>{const result=await new Promise<string>((resolve,reject)=>uni.scanCode({onlyFromCamera:false,success:value=>resolve(value.result),fail:()=>reject(new Error('当前环境未完成扫码，可粘贴资料码或汉字导入'))}));text.value=result;await preview()})}
function handleSave():void{void perform(async()=>{const id=await saveCollection({name:name.value,characterIds:entries.value.map(item=>item.id)});await openFeature(`/pages/collection-detail/index?id=${encodeURIComponent(id)}`,true)})}
function handleDetail(id:string):void{void perform(()=>openFeature(`/pages/character-detail/index?id=${encodeURIComponent(id)}`))}
</script>
<template><FeaturePage title="扫一扫与资料码导入" :loading="loading" :error="error" @retry="reload"><p class="feature-note">接受本应用字单资料码或汉字文本，解析后先预览，不打开外部网址。相机或图片扫码不可用时，可粘贴文字继续。</p><button role="button" class="feature-button secondary" :disabled="busy" @click="handleScan">使用相机或图片扫码</button><FeatureTextField v-model="text" label="资料码或汉字文本" multiline :maxlength="50000"/><button role="button" class="feature-button secondary" :disabled="busy" @click="handlePreview">解析导入预览</button><template v-if="hasPreview"><FeatureTextField v-model="name" label="导入后的字单名称" :maxlength="60"/><h2 class="feature-section-title">已收录 {{ entries.length }} 字</h2><p v-if="missing.length" class="feature-note">未收录：{{ missing.join('、') }}</p><CharacterRows :entries="entries.slice(0,50)" @item-click="handleDetail"/><p v-if="entries.length>50" class="feature-muted">预览前 50 字，确认后导入全部 {{ entries.length }} 字。</p></template><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p><template #footer><button role="button" class="feature-button" :disabled="busy||!hasPreview||!entries.length" @click="handleSave">确认导入字单</button></template></FeaturePage></template>
