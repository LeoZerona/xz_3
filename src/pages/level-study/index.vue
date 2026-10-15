<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import type { LearningFont } from "../../fonts/types";
import { useCharacterLearningStore } from "../../stores/characterLearning";
import { useFontStore } from "../../stores/fonts";
import { useLevelProgressStore } from "../../stores/levelProgress";
import { getStage, STAGES_BY_CATEGORY, type LevelCategory } from "../../study/levelData";
import { getEffectiveStudyModes, STUDY_MODES } from "../../study/modes";
import type { StudyMode } from "../../study/modes";
import type { StudyCharacterEntry } from "../../study/types";
import StudyQuestionCard from "../study/components/StudyQuestionCard.vue";

interface StudyQuestion {
  mode: StudyMode;
  position: number;
  character: StudyCharacterEntry;
  options: StudyCharacterEntry[];
  promptFont: LearningFont;
  answerFont: LearningFont;
  learningFont: LearningFont;
  referenceFont: LearningFont;
}

const fontStore = useFontStore();
const learningStore = useCharacterLearningStore();
const levelProgressStore = useLevelProgressStore();
const { currentFont, referenceFont } = storeToRefs(fontStore);

const queryCategory = ref<LevelCategory>("level1");
const queryStageId = ref("");

onLoad((options: any) => {
  const cat = (options?.category as LevelCategory | undefined) ?? "level1";
  if (cat === "radical" || cat === "level1" || cat === "level2" || cat === "level3") queryCategory.value = cat;
  queryStageId.value = options?.stageId ?? "";
});

const stage = computed(() => {
  if (queryStageId.value) return getStage(queryCategory.value, queryStageId.value) ?? null;
  return null;
});

const stageTitle = computed(() => stage.value?.title ?? "关卡学习");
const categoryLabel = computed(() => {
  if (queryCategory.value === "radical") return "偏旁部首";
  if (queryCategory.value === "level1") return "一级汉字";
  if (queryCategory.value === "level2") return "二级汉字";
  return "三级汉字";
});

const stageCharacters = computed<StudyCharacterEntry[]>(() => stage.value?.characters ?? []);

const effectiveModes = computed(() => getEffectiveStudyModes());
const totalModeCount = computed(() => effectiveModes.value.length);

function buildInterleaved(chars: StudyCharacterEntry[], modes: StudyMode[]): Array<{ character: StudyCharacterEntry; mode: StudyMode }> {
  if (chars.length === 0 || modes.length === 0) return [];
  const groups: StudyCharacterEntry[][] = modes.map(() => [...chars]);
  const interleaved: Array<{ character: StudyCharacterEntry; mode: StudyMode }> = [];
  const indices = groups.map(() => 0);
  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    for (let gi = 0; gi < groups.length; gi++) {
      let taken = 0;
      while (taken < 4 && indices[gi] < groups[gi].length) {
        interleaved.push({ character: groups[gi][indices[gi]]!, mode: modes[gi]! });
        indices[gi]++;
        taken++;
        hasMore = true;
      }
    }
  }
  return interleaved;
}

const allTasksInterleaved = computed(() => buildInterleaved(stageCharacters.value, effectiveModes.value));

function findFirstIncompleteIndex(): number {
  const tasks = allTasksInterleaved.value;
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]!;
    if (!learningStore.isModeComplete(t.character.id, t.mode)) return i;
  }
  return tasks.length;
}

const currentTaskIndex = ref(0);
const selectedAnswer = ref<string | null>(null);
const inputAnswer = ref("");
const hasAttempted = ref(false);
const hasAnswered = ref(false);

function resetQuestionState() {
  selectedAnswer.value = null;
  inputAnswer.value = "";
  hasAttempted.value = false;
  hasAnswered.value = false;
}
const hasPromptedResume = ref(false)

function maybePromptResume() {
  const tasks = allTasksInterleaved.value
  const s = stage.value
  if (!s || tasks.length === 0) return
  if (hasPromptedResume.value) return
  try { levelProgressStore.hydrate() } catch {}
  const firstIncomplete = findFirstIncompleteIndex()
  if (firstIncomplete === 0 || firstIncomplete >= tasks.length) {
    hasPromptedResume.value = true
    return
  }
  hasPromptedResume.value = true
  const stageId = s.id
  const charIds = s.characters.map((c) => c.id)
  try {
    uni.showModal({
      title: "继续学习",
      content: `检测到该关卡已学习 ${firstIncomplete} 题，是否从上次进度继续？`,
      confirmText: "继续学习",
      cancelText: "重新开始",
      success: (res: any) => {
        if (res && res.confirm) {
          currentTaskIndex.value = firstIncomplete
          resetQuestionState()
        } else {
          // 重新开始：即使不答题也要立即清零并持久化，保证下次进入为 0
          try { levelProgressStore.resetStage(stageId) } catch {}
          try { (learningStore as any).resetCharacters?.(charIds) } catch {}
          currentTaskIndex.value = 0
          resetQuestionState()
        }
      },
      fail: () => {
        currentTaskIndex.value = firstIncomplete
        resetQuestionState()
      },
    })
  } catch {
    currentTaskIndex.value = firstIncomplete
    resetQuestionState()
  }
}

watch(
  () => stage.value?.id,
  () => {
    hasPromptedResume.value = false
    currentTaskIndex.value = findFirstIncompleteIndex()
    resetQuestionState()
    setTimeout(() => maybePromptResume(), 80)
  },
  { immediate: true }
)
watch(allTasksInterleaved, () => {
  const tasks = allTasksInterleaved.value
  if (tasks.length === 0) {
    currentTaskIndex.value = 0
    return
  }
  if (currentTaskIndex.value >= tasks.length || (tasks[currentTaskIndex.value] && learningStore.isModeComplete(tasks[currentTaskIndex.value]!.character.id, tasks[currentTaskIndex.value]!.mode))) {
    currentTaskIndex.value = findFirstIncompleteIndex()
  }
  if (!hasPromptedResume.value) maybePromptResume()
})

const remainingTasks = computed(() => allTasksInterleaved.value.filter((t) => !learningStore.isModeComplete(t.character.id, t.mode)));
const currentTask = computed(() => allTasksInterleaved.value[currentTaskIndex.value] ?? null);
const currentCharacter = computed(() => currentTask.value?.character ?? null);
const activeMode = computed<StudyMode>(() => currentTask.value?.mode ?? effectiveModes.value[0] ?? STUDY_MODES[0]);

const isCorrect = computed(() => {
  if (!currentCharacter.value) return false;
  if (!hasAnswered.value) return false;
  return true;
});

const isInputAnswerCorrect = computed(() => {
  if (activeMode.value !== "seal-to-reference-input") return false;
  return hasAnswered.value;
});

const modePosition = computed(() => {
  if (!currentCharacter.value) return 1;
  const modes = effectiveModes.value;
  const idx = modes.indexOf(activeMode.value);
  return idx === -1 ? 1 : idx + 1;
});

const isLastMode = computed(() => {
  if (!currentCharacter.value) return false;
  const lastMode = effectiveModes.value[effectiveModes.value.length - 1];
  if (!lastMode) return false;
  const charId = currentCharacter.value.id;
  // 是否该字所有模式都已完成
  return effectiveModes.value.every((m) => learningStore.isModeComplete(charId, m) || (activeMode.value === m && hasAnswered.value));
});

const isLastCharacter = computed(() => remainingTasks.value.length <= 1 && hasAnswered.value);

const isStageComplete = computed(() => remainingTasks.value.length === 0 || (remainingTasks.value.length === 1 && hasAnswered.value && isLastCharacter.value) || allTasksInterleaved.value.length > 0 && allTasksInterleaved.value.every((t) => learningStore.isModeComplete(t.character.id, t.mode)));

const progressDone = computed(() => stageCharacters.value.length - remainingTasks.value.reduce((acc, t) => {
  // 去重按 character
  return acc;
}, 0));

const stageProgressText = computed(() => {
  const total = stageCharacters.value.length;
  const sid = stage.value?.id ?? "";
  let tracked = 0;
  try { tracked = sid ? levelProgressStore.getStageCompletedCount(sid) : 0; } catch {}
  let fallback = 0;
  for (const ch of stageCharacters.value) {
    if (learningStore.isCharacterComplete(ch.id)) fallback += 1;
  }
  const done = Math.max(tracked, fallback);
  if (sid && levelProgressStore.isStageCompleted(sid)) return total + "/" + total;
  return done + "/" + total;
});

const currentQuestion = computed<StudyQuestion | null>(() => {
  const task = currentTask.value;
  if (!task) return null;
  const char = task.character;
  const position = currentTaskIndex.value + 1;
  const all = STAGES_BY_CATEGORY[queryCategory.value]?.flatMap((s) => s.characters) ?? stageCharacters.value;
  const seed = char.id.charCodeAt(char.id.length - 1) + position;
  return {
    mode: task.mode,
    position,
    character: char,
    options: buildChoiceOptions(all.length > 0 ? all : stageCharacters.value, char, seed),
    promptFont: task.mode === "reference-to-seal-choice" ? referenceFont.value : currentFont.value,
    answerFont: task.mode === "reference-to-seal-choice" ? currentFont.value : referenceFont.value,
    learningFont: currentFont.value,
    referenceFont: referenceFont.value,
  };
});

function buildChoiceOptions(entries: StudyCharacterEntry[], answer: StudyCharacterEntry | undefined, seed: number): StudyCharacterEntry[] {
  if (!answer) return [];
  const choices: StudyCharacterEntry[] = [answer];
  for (let offset = 0; choices.length < 4 && offset < entries.length; offset += 1) {
    const candidate = entries[(seed + offset) % entries.length];
    if (candidate && !choices.some((c) => c.id === candidate.id)) choices.push(candidate);
  }
  const shift = choices.length > 0 ? (seed * 3 + 1) % choices.length : 0;
  return [...choices.slice(shift), ...choices.slice(0, shift)];
}

function handleChoiceAnswer(character: string) {
  const current = currentCharacter.value;
  if (hasAnswered.value || !current) return;
  selectedAnswer.value = character;
  hasAttempted.value = true;
  const isAnswerCorrect = character === current.script_forms.simplified;
  try {
    learningStore.recordModeAttempt(current.id, activeMode.value, isAnswerCorrect);
    if (isAnswerCorrect) levelProgressStore.markCharacterCompleted(queryStageId.value, current.id);
  } catch {}
  if (!isAnswerCorrect) return;
  hasAnswered.value = true;
  checkStageCompletion();
}

function handleInputAnswer(value: string) {
  inputAnswer.value = Array.from(value.trim()).slice(0, 1).join("");
  hasAttempted.value = false;
}

function submitInputAnswer(value: string) {
  inputAnswer.value = Array.from(value.trim()).slice(0, 1).join("");
  if (!inputAnswer.value || hasAnswered.value) return;
  hasAttempted.value = true;
  const expected = currentCharacter.value?.script_forms;
  if (!expected) return;
  const isAnswerCorrect = inputAnswer.value === expected.simplified || inputAnswer.value === expected.traditional;
  try {
    learningStore.recordModeAttempt(currentCharacter.value!.id, activeMode.value, isAnswerCorrect);
    if (isAnswerCorrect) levelProgressStore.markCharacterCompleted(queryStageId.value, currentCharacter.value!.id);
  } catch {}
  if (!isAnswerCorrect) return;
  hasAnswered.value = true;
  checkStageCompletion();
}

function checkStageCompletion() {
  if (!stage.value) return;
  const ch = currentCharacter.value;
  if (!ch) return;
  // 若该字已完成全部模式，可视为该字完成；若整关所有字都完成，则标记关卡完成
  const allChars = stage.value.characters;
  const allDone = allChars.every((c) => learningStore.isCharacterComplete(c.id));
  if (allDone) {
    levelProgressStore.markStageCompleted(stage.value.id);
  }
}

function advanceToNextIncomplete() {
  const tasks = allTasksInterleaved.value;
  let next = currentTaskIndex.value + 1;
  while (next < tasks.length && learningStore.isModeComplete(tasks[next]!.character.id, tasks[next]!.mode)) next++;
  currentTaskIndex.value = next;
}

function handleNext() {
  if (!isCorrect.value || !currentCharacter.value) return;
  resetQuestionState();
  advanceToNextIncomplete();
  if (!allTasksInterleaved.value[currentTaskIndex.value]) {
    if (isStageComplete.value && stage.value) {
      levelProgressStore.markStageCompleted(stage.value.id);
      try {
        uni.showModal({
          title: "关卡完成",
          content: stage.value.title + " 已完成" + stage.value.characters.length + "字的 " + totalModeCount.value + " 种练习",
          showCancel: false,
          success: () => {
            try { uni.navigateBack({ delta: 1 }); } catch { uni.reLaunch({ url: "/pages/levels/index" }); }
          },
        });
      } catch {
        uni.navigateBack({ delta: 1 });
      }
    }
  }
}

function handleBack() {
  try { uni.navigateBack({ delta: 1 }); } catch { uni.reLaunch({ url: "/pages/levels/index" }); }
}

function toggleFavorite() {
  const ch = currentCharacter.value;
  if (!ch) return;
  learningStore.toggleFavorite(ch.id);
  try { uni.showToast({ title: learningStore.isFavorite(ch.id) ? "已收藏" : "已取消收藏", icon: "none" }); } catch {}
}

onMounted(() => {
  try { uni.pageScrollTo({ scrollTop: 0, duration: 0 }); } catch {}
});

onBeforeUnmount(() => {});
</script>

<template>
  <view class="study-page">
    <view class="study-topbar">
      <button class="topbar-button" aria-label="返回" @click="handleBack">
        <text class="back-icon" aria-hidden="true">‹</text>
      </button>
      <view style="text-align:center;min-width:0">
        <text style="display:block;font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ categoryLabel }} · {{ stageTitle }}</text>
        <text style="display:block;color:var(--color-text-muted);font-size:8px">固定 10 字 · {{ stageCharacters.length }}字 · {{ stageProgressText }}</text>
      </view>
      <view class="topbar-actions">
        <button class="topbar-button" aria-label="收藏" @click="toggleFavorite">
          <van-icon :name="currentCharacter && learningStore.isFavorite(currentCharacter.id) ? 'star' : 'star-o'" size="20" />
        </button>
      </view>
    </view>

    <view v-if="!isCorrect" class="progress-card" aria-label="关卡进度">
      <view class="progress-item">
        <text class="progress-label">本关进度</text>
        <text class="progress-value">{{ stageProgressText }}</text>
      </view>
      <view class="progress-item">
        <text class="progress-label">练习模式</text>
        <text class="progress-value">{{ totalModeCount }}种</text>
      </view>
      <view class="progress-item">
        <text class="progress-label">剩余题</text>
        <text class="progress-value">{{ remainingTasks.length }}</text>
      </view>
    </view>

    <StudyQuestionCard
      v-if="currentQuestion"
      :key="currentQuestion.character.id + '-' + currentQuestion.mode"
      :question="currentQuestion"
      :selected-answer="selectedAnswer"
      :input-answer="inputAnswer"
      :has-attempted="hasAttempted"
      :is-correct="isCorrect"
      :is-last-mode="isLastMode"
      :is-last-character="isLastCharacter"
      :mode-position="modePosition"
      @answer-choice="handleChoiceAnswer"
      @update:input-answer="handleInputAnswer"
      @submit-input="submitInputAnswer"
      @next="handleNext"
    />
    <view v-else class="empty-study" role="status">
      <text class="empty-study-title">{{ isStageComplete ? "本关已完成" : "暂无可学习文字" }}</text>
      <text class="empty-study-description">{{ isStageComplete ? "该关卡的全部文字已完成全部练习" : "关卡数据为空" }}</text>
      <view class="complete-return" role="button" tabindex="0" @click="handleBack" @keydown.enter="handleBack">返回关卡</view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.study-page { width: min(100%, 560px); height: 100vh; height: 100dvh; margin: 0 auto; overflow: hidden; display: flex; flex-direction: column; color: var(--color-text); background: radial-gradient(circle at 90% 0, var(--color-primary-soft) 0, transparent 34%), linear-gradient(180deg, var(--color-topbar) 0, var(--color-page) 48%, var(--color-surface-muted) 100%); }
.study-topbar { min-height: calc(64px + var(--app-top-safe-area)); padding: var(--app-top-safe-area) 14px 4px; display: grid; grid-template-columns: 88px 1fr 88px; align-items: center; }
.topbar-actions { display: flex; justify-content: flex-end; gap: 6px; }
.topbar-button { width: 40px; height: 40px; margin: 0; padding: 0; display: grid; place-items: center; border: 0; background: transparent; color: var(--color-text); line-height: 1; }
.topbar-button::after { border: 0; }
.back-icon { font-size: 27px; font-weight: 300; }
.progress-card { margin: 2px 16px 0; padding: 15px 12px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid color-mix(in srgb, var(--color-border) 84%, transparent); border-radius: 18px; background: var(--color-surface); box-shadow: 0 10px 28px color-mix(in srgb, var(--color-shadow) 88%, transparent); }
.progress-item { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.progress-label { color: var(--color-text-muted); font-size: 10px; }
.progress-value { font-size: 17px; font-weight: 700; letter-spacing: -.04em; }
.empty-study { min-height: 0; padding: 30px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; }
.empty-study-title { font-size: 15px; font-weight: 700; }
.empty-study-description { color: var(--color-text-muted); font-size: 11px; }
.complete-return { min-width: 132px; height: 44px; margin-top: 10px; display: flex; align-items: center; justify-content: center; border-radius: 9px; background: var(--color-primary); color: var(--color-on-primary); font-size: 13px; font-weight: 600; cursor: pointer; }
</style>





