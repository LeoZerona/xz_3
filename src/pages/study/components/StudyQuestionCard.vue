<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CharacterFontComparison from '../../../components/CharacterFontComparison.vue'
import type { LearningFont } from '../../../fonts/types'
import { INPUT_STUDY_MODE } from '../../../study/modes'
import type { StudyMode } from '../../../study/modes'
import type { StudyCharacterEntry } from '../../../study/types'

interface StudyQuestion {
  mode: StudyMode
  position: number
  character: StudyCharacterEntry
  options: StudyCharacterEntry[]
  promptFont: LearningFont
  answerFont: LearningFont
  learningFont: LearningFont
  referenceFont: LearningFont
}

interface Props {
  question: StudyQuestion
  selectedAnswer: string | null
  inputAnswer: string
  hasAttempted: boolean
  isCorrect: boolean
  isLastQuestion: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'answer-choice', character: string): void
  (event: 'update:input-answer', value: string): void
  (event: 'submit-input', value: string): void
  (event: 'next'): void
}>()

const isInputMode = computed(() => props.question.mode === INPUT_STUDY_MODE)
const localInputAnswer = ref(props.inputAnswer)
const wrongAttemptCount = ref(0)
const actionLabel = computed(() => {
  if (!props.isCorrect) return '确认'
  return props.isLastQuestion ? '完成今日学习' : '下一字'
})
const actionAriaLabel = computed(() => {
  if (!props.isCorrect) return '确认输入答案'
  return props.isLastQuestion ? '完成今日学习' : '进入下一字'
})

watch(localInputAnswer, (value) => {
  const normalizedValue = Array.from(value.trim()).slice(0, 1).join('')
  if (normalizedValue !== value) {
    localInputAnswer.value = normalizedValue
    return
  }
  emit('update:input-answer', normalizedValue)
})

function handlePrimaryAction() {
  if (props.isCorrect) {
    emit('next')
    return
  }
  emit('submit-input', localInputAnswer.value)
}

function handleChoiceAnswer(character: string) {
  if (character !== props.question.character.script_forms.simplified) {
    wrongAttemptCount.value += 1
  }
  emit('answer-choice', character)
}
</script>

<template>
  <view class="question-stage">
    <view v-if="!isCorrect" class="question-content">
      <view class="prompt-card"
        :aria-label="`题目使用${question.promptFont.name}展示，${question.character.script_forms.simplified}`">
        <text class="prompt-character" :style="{ fontFamily: question.promptFont.fontFamily }">
          {{ question.character.script_forms.simplified }}
        </text>
        <view class="character-clues">
          <text>{{ question.character.phonetics.pinyin }}</text>
          <text aria-hidden="true">·</text>
          <text>{{ question.character.structure.total_strokes }} 画</text>
          <text aria-hidden="true">·</text>
          <text>{{ question.character.structure.layout }}</text>
        </view>
      </view>

      <template v-if="!isInputMode">
        <view class="choice-grid" role="group" aria-label="请选择相同的文字">
          <button v-for="option in question.options"
            :key="`${option.id}-${selectedAnswer === option.script_forms.simplified ? wrongAttemptCount : 0}`"
            class="character-option" role="button" :class="{
              'is-selected': selectedAnswer === option.script_forms.simplified,
              'is-wrong': selectedAnswer === option.script_forms.simplified && option.id !== question.character.id,
            }" :aria-label="`选择文字${option.script_forms.simplified}`"
            :aria-pressed="selectedAnswer === option.script_forms.simplified"
            @click="handleChoiceAnswer(option.script_forms.simplified)">
            <text :style="{ fontFamily: question.answerFont.fontFamily }">{{ option.script_forms.simplified }}</text>
          </button>
        </view>
        <text v-if="hasAttempted && !isCorrect" class="answer-error" role="status">
          选择错误，请重新选择
        </text>
      </template>

      <view v-else class="input-panel">
        <label class="input-label" :class="{ 'is-error': hasAttempted }">
          <text class="sr-only">输入识别结果</text>
          <input class="answer-input" type="text" v-model="localInputAnswer"
            :style="{ fontFamily: question.answerFont.fontFamily }" maxlength="1" confirm-type="done"
            placeholder="请输入一个字" placeholder-style="font-size: 13px; color: var(--color-text-muted);"
            @confirm="handlePrimaryAction">
        </label>
        <text v-if="hasAttempted" class="sr-only" role="status">答案不正确，请重新输入</text>
      </view>
    </view>

    <scroll-view v-else class="detail-scroll" scroll-y :show-scrollbar="false" aria-label="文字详情">
      <view class="detail-hero">
        <CharacterFontComparison :character="question.character.script_forms.simplified"
          :learning-font="question.learningFont" :reference-font="question.referenceFont" />
        <view class="detail-reading">
          <text>{{ question.character.phonetics.pinyin }}</text>
          <text>{{ question.character.structure.total_strokes }} 画</text>
          <text>{{ question.character.structure.layout }}</text>
        </view>
      </view>

      <view class="detail-content">
        <view class="info-card">
          <text class="card-title">基本释义</text>
          <text class="definition">{{ question.character.semantics.definition }}</text>
          <view class="word-list" aria-label="常用词语">
            <text v-for="word in question.character.semantics.words" :key="word" class="word-chip">{{ word }}</text>
          </view>
        </view>

        <view class="info-card structure-card">
          <view class="structure-item">
            <text class="meta-label">字形结构</text>
            <text class="meta-value">{{ question.character.structure.layout }}</text>
          </view>
          <view class="structure-item">
            <text class="meta-label">造字法</text>
            <text class="meta-value">{{ question.character.structure.liushu }}</text>
          </view>
          <view class="structure-item structure-wide">
            <text class="meta-label">字形说明</text>
            <text class="meta-value">{{ question.character.structure.liushu_detail }}</text>
          </view>
        </view>

        <view class="info-card">
          <text class="card-title">《说文解字》</text>
          <text class="source-version">{{ question.character.shuowen.source_version }}</text>
          <text class="classical-text">{{ question.character.shuowen.original }}</text>
          <text class="translation">{{ question.character.shuowen.translation }}</text>
        </view>

        <view v-if="question.character.study.tags.length" class="tag-list" aria-label="文字标签">
          <text v-for="tag in question.character.study.tags" :key="tag" class="tag">{{ tag }}</text>
        </view>
      </view>
    </scroll-view>

    <button v-if="isInputMode || isCorrect" class="primary-action" role="button"
      :disabled="!isCorrect && !localInputAnswer.trim()" :aria-label="actionAriaLabel" @click="handlePrimaryAction">
      <text>{{ actionLabel }}</text>
      <van-icon v-if="isCorrect && !isLastQuestion" name="arrow" size="16" aria-hidden="true" />
    </button>
  </view>
</template>

<style scoped lang="scss">
.question-stage {
  min-height: 0;
  padding: clamp(28px, 4vh, 36px) 16px calc(18px + env(safe-area-inset-bottom));
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.question-content,
.detail-scroll {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
}

.prompt-card {
  min-height: 184px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--color-border) 84%, transparent);
  border-radius: 20px;
  background: var(--color-surface);
  box-shadow: 0 12px 32px color-mix(in srgb, var(--color-shadow) 88%, transparent);
}

.prompt-character {
  font-size: clamp(66px, calc(20vw - 2px), 94px);
  font-weight: 500;
  line-height: 1.1;
}

.character-clues {
  margin-top: 14px;
  padding: 5px 10px;
  display: flex;
  align-items: center;
  gap: 7px;
  border-radius: 999px;
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
  font-size: 10px;
}

.choice-grid {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.character-option {
  height: 82px;
  margin: 0;
  padding: 0;
  display: grid;
  place-items: center;
  border: 1.5px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: 0 5px 16px color-mix(in srgb, var(--color-shadow) 84%, transparent);
  font-size: 40px;
  line-height: 1;
}

.character-option::after,
.primary-action::after {
  border: 0;
}

.character-option.is-selected {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.character-option.is-wrong {
  border-color: #e88455;
  background: color-mix(in srgb, #e88455 10%, var(--color-surface));
  color: #d16d3c;
  animation: wrong-option-shake 360ms ease-out;
}

.answer-error {
  width: 100%;
  margin-top: 10px;
  display: block;
  color: #d16d3c;
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
}

.input-panel {
  margin-top: 22px;
}

.input-label {
  min-width: 0;
  height: 74px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  border: 1.5px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-surface);
  box-shadow: 0 5px 16px color-mix(in srgb, var(--color-shadow) 84%, transparent);
}

.input-label:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 12%, transparent);
}

.input-label.is-error {
  border-color: #e88455;
  background: color-mix(in srgb, #e88455 7%, var(--color-surface));
}

.answer-input {
  width: 100%;
  height: 100%;
  color: var(--color-text);
  font-size: 36px;
  text-align: center;
}

.answer-input::placeholder {
  color: var(--color-text-muted);
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
  font-size: 13px;
}

.primary-action {
  width: 100%;
  height: 52px;
  margin: 14px 0 0;
  padding: 0 18px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 10px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 14px;
  font-weight: 700;
}

.primary-action[disabled] {
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}

.detail-scroll {
  border-radius: 16px;
  background: var(--color-page);
}

.detail-hero {
  padding: 14px 12px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(180deg, var(--color-topbar), var(--color-primary-soft));
}

.detail-reading {
  margin-top: 12px;
  padding: 6px 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-surface) 72%, transparent);
  color: var(--color-text-secondary);
  font-size: 10px;
}

.detail-reading text+text {
  position: relative;
}

.detail-reading text+text::before {
  content: '';
  position: absolute;
  top: 50%;
  left: -8px;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: currentColor;
}

.detail-content {
  padding: 12px 2px 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-card {
  padding: 15px 14px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  box-shadow: 0 6px 20px var(--color-shadow);
}

.card-title {
  font-size: 13px;
  font-weight: 700;
}

.definition {
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.word-list,
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.word-chip,
.tag {
  padding: 6px 10px;
  border-radius: 14px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: 10px;
}

.structure-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 12px;
}

.structure-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.structure-wide {
  grid-column: 1 / -1;
}

.meta-label,
.source-version {
  color: var(--color-text-muted);
  font-size: 9px;
}

.meta-value,
.classical-text,
.translation {
  font-size: 11px;
  line-height: 1.65;
}

.translation {
  padding-top: 9px;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.tag-list {
  padding: 2px;
}

.tag {
  background: var(--color-surface-muted);
  color: var(--color-text-secondary);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@keyframes wrong-option-shake {

  0%,
  100% {
    transform: translateX(0);
  }

  20% {
    transform: translateX(-6px);
  }

  40% {
    transform: translateX(5px);
  }

  60% {
    transform: translateX(-3px);
  }

  80% {
    transform: translateX(2px);
  }
}

@media (max-height: 760px) {
  .question-stage {
    padding-top: 28px;
  }

  .prompt-card {
    min-height: 150px;
    padding: 12px;
  }

  .prompt-character {
    font-size: 64px;
  }

  .character-clues {
    margin-top: 8px;
  }

  .choice-grid,
  .input-panel {
    margin-top: 16px;
  }

  .choice-grid {
    gap: 10px;
  }

  .character-option {
    height: 68px;
    font-size: 34px;
  }

  .input-label {
    height: 66px;
  }
}

@media (prefers-reduced-motion: reduce) {

  .question-content,
  .detail-scroll {
    scroll-behavior: auto;
  }

  .character-option.is-wrong {
    animation: none;
  }
}
</style>
