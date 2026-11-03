<script setup lang="ts">
import {ref} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import FeaturePage from '../../components/FeaturePage.vue'
import CharacterRows from '../../collections/CharacterRows.vue'
import {getDatabase} from '../../database/connection'
import {getCharacters} from '../../database/catalog'
import {openFeature,useFeatureAction,useFeatureTask} from '../../features/useFeatureTask'
import type {StudyCharacterEntry} from '../../study/types'
const word=ref('');const characters=ref<StudyCharacterEntry[]>([]);const {actionError,perform}=useFeatureAction();onLoad(options=>{word.value=typeof options?.word==='string'?options.word:''})
const {loading,error,reload}=useFeatureTask(async()=>{const rows=await(await getDatabase()).query('character_words',{where:{word:word.value}});if(!rows.length)throw new Error('本机组词记录中没有这个词');characters.value=await getCharacters([...new Set(rows.map(row=>String(row.characterId)))])})
function handleOpen(id:string):void{void perform(()=>openFeature(`/pages/character-detail/index?id=${encodeURIComponent(id)}`))}
</script>
<template><FeaturePage title="词语来源" back-url="/pages/search/index" :loading="loading" :error="error" @retry="reload"><div class="feature-hero"><h2>{{ word }}</h2><p class="feature-note">这个词来自下列文字的内置组词记录，当前字库没有提供独立词义。单字释义不等同于词语释义。</p></div><h2 class="feature-section-title">组词关联文字</h2><CharacterRows :entries="characters" @item-click="handleOpen"/><p v-if="actionError" class="feature-error" role="alert">{{ actionError }}</p></FeaturePage></template>
