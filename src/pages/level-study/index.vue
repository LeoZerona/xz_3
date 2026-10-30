<script setup lang="ts">
import { onBackPress, onHide } from "@dcloudio/uni-app";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import type { LearningFont } from "../../fonts/types";
import { useCharacterLearningStore } from "../../stores/characterLearning";
import { useFontStore } from "../../stores/fonts";
import { useThemeStore } from "../../stores/theme";
import { useLevelProgressStore } from "../../stores/levelProgress";
import { getStage, loadStage, STAGES_BY_CATEGORY, type LevelCategory, type LevelStage } from "../../study/levelData";
import { getEffectiveStudyModes, STUDY_MODES } from "../../study/modes";
import type { StudyMode } from "../../study/modes";
import type { StudyCharacterEntry } from "../../study/types";
import { createWrongAttemptQueue, WRONG_ANSWER_FEEDBACK_MS } from "../../study/feedback";
import StudyPreviewPanel from "../../components/StudyPreviewPanel.vue";
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
const { themeStyle } = storeToRefs(useThemeStore());

const queryCategory = ref<LevelCategory>("level1");
const queryStageId = ref("");

onLoad((options) => {
  const cat = options?.category ?? "level1";
  if (cat === "radical" || cat === "level1" || cat === "level2" || cat === "level3") queryCategory.value = cat;
  queryStageId.value = typeof options?.stageId === "string" ? options.stageId : "";
});

watch([queryCategory, queryStageId], () => {
  showPreview.value = true;
  void refreshStage();
});

const loadedStage = ref<LevelStage | null>(null);
const stageLoadError = ref("");
let stageLoadSeq = 0;
const isStageLoading = ref(false);
const stage = computed(() => loadedStage.value);

async function refreshStage() {
  const seq = ++stageLoadSeq;
  const cat = queryCategory.value;
  const sid = queryStageId.value;
  if (!sid) {
    loadedStage.value = null;
    stageLoadError.value = "";
    isStageLoading.value = false;
    return;
  }
  const cached = getStage(cat, sid);
  if (cached) {
    loadedStage.value = cached;
    stageLoadError.value = "";
    isStageLoading.value = false;
    return;
  }
  isStageLoading.value = true;
  stageLoadError.value = "";
  try {
    const fetched = await loadStage(cat, sid);
    if (seq !== stageLoadSeq) return;
    if (fetched) {
      loadedStage.value = fetched;
    } else {
      loadedStage.value = null;
      stageLoadError.value = "未找到对应关卡";
    }
  } catch (e) {
    if (seq !== stageLoadSeq) return;
    loadedStage.value = null;
    stageLoadError.value = e instanceof Error ? e.message : "关卡数据加载失败";
  } finally {
    if (seq === stageLoadSeq) isStageLoading.value = false;
  }
}

const stageTitle = computed(() => stage.value?.title ?? "关卡学习");
const categoryLabel = computed(() => {
  if (queryCategory.value === "radical") return "偏旁部首";
  if (queryCategory.value === "level1") return "一级汉字";
  if (queryCategory.value === "level2") return "二级汉字";
  return "三级汉字";
});

const previewCharacters = computed<StudyCharacterEntry[]>(() => stage.value?.characters ?? []);
const stageCharacters = computed<StudyCharacterEntry[]>(() => previewCharacters.value
  .filter((character) => !learningStore.isExcluded(character.id)));
const excludedStageCount = computed(() => previewCharacters.value.length - stageCharacters.value.length);
const previewDescription = computed(() => `参与学习 ${stageCharacters.value.length} 字 · 已斩 ${excludedStageCount.value} 字 · 再次点击已斩可恢复`);

function handleToggleCharacterSlash(characterId: string) {
  learningStore.toggleExcluded(characterId);
  uni.showToast({
    title: learningStore.isExcluded(characterId) ? "已斩，后续关卡学习不再出现" : "已取消斩，恢复关卡学习",
    icon: "none",
  });
}

function openCharacterDetail(characterId: string) {
  uni.navigateTo({ url: `/pages/character-detail/index?id=${encodeURIComponent(characterId)}&category=${queryCategory.value}&stageId=${encodeURIComponent(queryStageId.value)}` });
}

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
const hintLevel = ref(0);
const forceDetail = ref(false);
const isCorrectAnimating = ref(false);
let pendingCorrectTimer: ReturnType<typeof setTimeout> | null = null;
const wrongAttemptQueue = createWrongAttemptQueue((attempt) => {
  learningStore.recordModeAttempt(attempt.characterId, attempt.mode, false, attempt.attemptedAt);
  if (attempt.shouldResetModes) learningStore.resetCharacterModes(attempt.characterId, attempt.attemptedAt);
});
const wrongCountMap = new Map<string, number>();
function taskKey(id: string, mode: string){ return id + "::" + mode }
function incWrongCount(){ const c=currentCharacter.value; if(!c) return 0; const k=taskKey(c.id, activeMode.value); let cur=wrongCountMap.get(k); if(cur===undefined) cur=0; const n=cur+1; wrongCountMap.set(k,n); return n }
const showPreview = ref(true);
const isPreviewVisible = computed(() => { if(!showPreview.value) return false; if(isStageLoading.value) return false; if(!stage.value) return false; return true });
function startPreviewLearning() {
  if (stageCharacters.value.length === 0) return;
  showPreview.value = false;
  currentTaskIndex.value = findFirstIncompleteIndex();
  resetQuestionState();
}
const inputAnswer = ref("");
const hasAttempted = ref(false);
const hasAnswered = ref(false);

function resetQuestionState() {
  wrongAttemptQueue.flush();
  selectedAnswer.value = null;
  inputAnswer.value = "";
  hasAttempted.value = false;
  hasAnswered.value = false;
  hintLevel.value = 0;
  forceDetail.value = false;
  isCorrectAnimating.value = false;
  if (pendingCorrectTimer) { clearTimeout(pendingCorrectTimer); pendingCorrectTimer = null }
}
const hasPromptedResume = ref(false)

function maybePromptResume() {
  const tasks = allTasksInterleaved.value
  const s = stage.value
  if (!s || tasks.length === 0) return
  if (hasPromptedResume.value) return
  levelProgressStore.hydrate()
  const firstIncomplete = findFirstIncompleteIndex()
  if (firstIncomplete === 0 || firstIncomplete >= tasks.length) {
    hasPromptedResume.value = true
    return
  }
  hasPromptedResume.value = true
  const stageId = s.id
  const charIds = stageCharacters.value.map((character) => character.id)
  try {
    uni.showModal({
      title: "继续学习",
      content: `检测到该关卡已学习 ${firstIncomplete} 题，是否从上次进度继续？`,
      confirmText: "继续学习",
      cancelText: "重新开始",
      success: (res) => {
        if (res && res.confirm) {
          currentTaskIndex.value = firstIncomplete
          resetQuestionState()
        } else {
          // 重新开始：即使不答题也要立即清零并持久化，保证下次进入为 0
          levelProgressStore.resetStage(stageId)
          learningStore.resetCharacters(charIds)
          wrongCountMap.clear()
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
    maybePromptResume()
  },
  { immediate: true }
)
// 排除名单或收藏变化可重算题单；保留正在作答/查看结果的题，点击下一题时才前进。
watch(allTasksInterleaved, (tasks, previousTasks) => {
  const previousTask = previousTasks[currentTaskIndex.value];
  const retainedIndex = previousTask ? tasks.findIndex((task) =>
    task.character.id === previousTask.character.id && task.mode === previousTask.mode) : -1;
  if (retainedIndex >= 0) {
    currentTaskIndex.value = retainedIndex;
    return;
  }
  currentTaskIndex.value = findFirstIncompleteIndex();
  resetQuestionState();
});

const remainingTasks = computed(() => allTasksInterleaved.value.filter((t) => !learningStore.isModeComplete(t.character.id, t.mode)));
const currentTask = computed(() => allTasksInterleaved.value[currentTaskIndex.value] ?? null);
const currentCharacter = computed(() => currentTask.value?.character ?? null);
const activeMode = computed<StudyMode>(() => currentTask.value?.mode ?? effectiveModes.value[0] ?? STUDY_MODES[0]);

const isCorrect = computed(() => {
  if (!currentCharacter.value) return false;
  if (!hasAnswered.value) return false;
  return true;
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

const isLastCharacter = computed(() => remainingTasks.value.length === 0 && hasAnswered.value && !forceDetail.value);

const isStageComplete = computed(() => !isStageLoading.value
  && Boolean(stage.value && !stage.value.isPlaceholder)
  && stageCharacters.value.length > 0
  && remainingTasks.value.length === 0);

const stageProgressText = computed(() => {
  const done = stageCharacters.value.filter((character) => learningStore.isCharacterComplete(character.id)).length;
  return `${done}/${stageCharacters.value.length}`;
});

const currentQuestion = computed<StudyQuestion | null>(() => {
  const task = currentTask.value;
  if (!task) return null;
  const char = task.character;
  const position = currentTaskIndex.value + 1;
  const all = STAGES_BY_CATEGORY[queryCategory.value].flatMap((stage) => stage.characters);
  const seed = char.id.charCodeAt(char.id.length - 1) + position;
  return {
    mode: task.mode,
    position,
    character: char,
    options: buildChoiceOptions((all.length > 0 ? all : stageCharacters.value)
      .filter((entry) => !learningStore.isExcluded(entry.id)), char, seed),
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

function completeAnswer(character: StudyCharacterEntry) {
  const mode = activeMode.value;
  const stageId = queryStageId.value;
  isCorrectAnimating.value = true;
  hasAttempted.value = false;
  pendingCorrectTimer = setTimeout(() => {
    pendingCorrectTimer = null;
    wrongAttemptQueue.flush();
    learningStore.recordModeAttempt(character.id, mode, true);
    if (learningStore.isCharacterComplete(character.id)) {
      levelProgressStore.markCharacterCompleted(stageId, character.id);
    }
    hasAnswered.value = true;
    isCorrectAnimating.value = false;
    if (isStageComplete.value) levelProgressStore.markStageCompleted(stageId);
  }, 150);
}

function recordWrongAnswer(character: StudyCharacterEntry) {
  hasAttempted.value = true;
  hintLevel.value = 1;
  const mode = activeMode.value;
  const wrongCount = incWrongCount();
  wrongAttemptQueue.enqueue({
    characterId: character.id,
    mode,
    attemptedAt: new Date().toISOString(),
    shouldResetModes: wrongCount >= 2 && mode !== effectiveModes.value[0],
  });
  if (wrongCount < 2) return;
  // 保留即时红色反馈，再展示错误后的详情；等待期间不重复记录作答。
  pendingCorrectTimer = setTimeout(() => {
    pendingCorrectTimer = null;
    forceDetail.value = true;
    hasAnswered.value = true;
  }, WRONG_ANSWER_FEEDBACK_MS);
}

function handleChoiceAnswer(character: string) {
  const current = currentCharacter.value;
  if (!current || hasAnswered.value || pendingCorrectTimer || forceDetail.value) return;
  selectedAnswer.value = character;
  if (character === current.script_forms.simplified) completeAnswer(current);
  else recordWrongAnswer(current);
}

function handleInputAnswer(value: string) {
  if (hasAnswered.value || pendingCorrectTimer) return;
  inputAnswer.value = Array.from(value.trim()).slice(0, 1).join("");
  hasAttempted.value = false;
}

function submitInputAnswer(value: string) {
  const current = currentCharacter.value;
  if (!current || hasAnswered.value || pendingCorrectTimer || forceDetail.value) return;
  inputAnswer.value = Array.from(value.trim()).slice(0, 1).join("");
  if (!inputAnswer.value) return;
  const expected = current.script_forms;
  if (inputAnswer.value === expected.simplified || inputAnswer.value === expected.traditional) completeAnswer(current);
  else recordWrongAnswer(current);
}

function advanceToNextIncomplete() {
  const tasks = allTasksInterleaved.value;
  let next = currentTaskIndex.value + 1;
  while (next < tasks.length && learningStore.isModeComplete(tasks[next]!.character.id, tasks[next]!.mode)) next++;
  // 错误后查看详情不会完成练习；走到末尾时回到尚未答对的题。
  currentTaskIndex.value = next < tasks.length ? next : findFirstIncompleteIndex();
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
          content: stage.value.title + " 已完成" + stageCharacters.value.length + "字的 " + totalModeCount.value + " 种练习",
          showCancel: false,
          success: () => {
            if (getCurrentPages().length > 1) {
            uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: "/pages/levels/index" }) })
          } else {
            uni.reLaunch({ url: "/pages/levels/index" })
          }
          },
        });
      } catch {
        if (getCurrentPages().length > 1) {
          uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: "/pages/levels/index" }) })
        } else {
          uni.reLaunch({ url: "/pages/levels/index" })
        }
      }
    }
  }
}

function handleBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: "/pages/levels/index" }) })
    return
  }
  uni.reLaunch({ url: "/pages/levels/index" })
}

onBackPress(() => {
  if (getCurrentPages().length > 1) {
    uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: "/pages/levels/index" }) })
    return true
  }
  uni.reLaunch({ url: "/pages/levels/index" })
  return true
})

function toggleFavorite() {
  const ch = currentCharacter.value;
  if (!ch) return;
  learningStore.toggleFavorite(ch.id);
  try { uni.showToast({ title: learningStore.isFavorite(ch.id) ? "已收藏" : "已取消收藏", icon: "none" }); } catch {}
}

onMounted(() => {
  try { uni.pageScrollTo({ scrollTop: 0, duration: 0 }); } catch {}
});

onHide(() => wrongAttemptQueue.flush());

onBeforeUnmount(()=>{
  stageLoadSeq += 1;
  wrongAttemptQueue.flush();
  if(pendingCorrectTimer){ clearTimeout(pendingCorrectTimer); pendingCorrectTimer=null }
});
</script>

<template>
  <view class="study-page" :style="themeStyle">
    <view v-if="isStageLoading" class="top-progress-bar" aria-hidden="true" />
    <view class="study-topbar">
      <button class="topbar-button" aria-label="返回" @click="handleBack">
        <text class="back-icon" aria-hidden="true">‹</text>
      </button>
      <view style="text-align:center;min-width:0">
        <text style="display:block;font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ categoryLabel }} · {{ stageTitle }}</text>
        <text style="display:block;color:var(--color-text-muted);font-size:8px">本关 {{ previewCharacters.length }} 字 · 已斩 {{ excludedStageCount }} 字 · {{ stageProgressText }}</text>
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

        <view v-if="isStageLoading" class="empty-study" role="status">
      <text class="empty-study-title">关卡加载中</text>
      <text class="empty-study-description">{{ stageLoadError || "正在加载关卡数据..." }}</text>
    </view>
    <view v-else-if="stageLoadError" class="empty-study" role="status">
      <text class="empty-study-title">加载失败</text>
      <text class="empty-study-description">{{ stageLoadError }}</text>
      <view class="complete-return" role="button" tabindex="0" @click="refreshStage" @keydown.enter="refreshStage">重试</view>
      <view class="complete-return" style="background:var(--color-surface);color:var(--color-text);border:1px solid var(--color-border);margin-top:8px" role="button" tabindex="0" @click="handleBack" @keydown.enter="handleBack">返回关卡</view>
    </view>
    <view v-else-if="isPreviewVisible" class="preview-panel" role="region" aria-label="关卡预览">
      <StudyPreviewPanel
        :key="stage?.id"
        :characters="previewCharacters"
        :learning-font="currentFont"
        :reference-font="referenceFont"
        :title="`本关共 ${previewCharacters.length} 个文字`"
        :description="previewDescription"
        can-slash
        :excluded-ids="learningStore.excludedIds"
        @slash-character="handleToggleCharacterSlash"
        @open-detail="openCharacterDetail"
      />
      <view class="preview-start-wrap">
        <button class="preview-start-button" role="button" :disabled="stageCharacters.length === 0" :aria-disabled="stageCharacters.length === 0" @click="startPreviewLearning">开始学习</button>
      </view>
    </view>
    <StudyQuestionCard
      v-else-if="currentQuestion"
      :key="currentQuestion.character.id + '-' + currentQuestion.mode"
      :question="currentQuestion"
      :selected-answer="selectedAnswer"
      :input-answer="inputAnswer"
      :has-attempted="hasAttempted"
      :is-correct="isCorrect"
      :is-last-mode="isLastMode"
      :is-last-character="isLastCharacter"
      :mode-position="modePosition"
      :hint-level="hintLevel"
      :force-detail="forceDetail"
      :is-correct-animating="isCorrectAnimating"
      :detail-animated="false"
      completion-label="完成本关学习"
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
.preview-panel { min-height: 0; flex: 1; display: flex; flex-direction: column; margin-top: 12px; overflow: hidden; }
.preview-start-wrap { padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); border-top: 1px solid var(--color-border); background: var(--color-surface); }
.preview-start-button { width: 100%; height: 50px; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; border: 0; border-radius: 9px; background: var(--color-primary); color: var(--color-on-primary); font-size: 14px; font-weight: 600; line-height: 1; }
.preview-start-button::after { border: 0; }
.preview-start-button[disabled] { background: var(--color-surface-muted); color: var(--color-text-muted); }
.preview-start-button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.complete-return { min-width: 132px; height: 44px; margin-top: 10px; display: flex; align-items: center; justify-content: center; border-radius: 9px; background: var(--color-primary); color: var(--color-on-primary); font-size: 13px; font-weight: 600; cursor: pointer; }
</style>






