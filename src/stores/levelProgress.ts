import { computed, ref } from "vue";
import { defineStore } from "pinia";


export const LEVEL_PROGRESS_STORAGE_KEY = "font-learning-level-progress";

interface LevelProgressState {
  completedStageIds: string[];
  stageCharacterCompleted: Record<string, string[]>;
  updatedAt: string;
}

function readState(): LevelProgressState {
  try {
    const raw = uni.getStorageSync(LEVEL_PROGRESS_STORAGE_KEY) as unknown;
    if (raw && typeof raw === "object") {
      const data = raw as Partial<LevelProgressState>;
      const ids = Array.isArray(data.completedStageIds) ? data.completedStageIds.filter((id): id is string => typeof id === "string") : [];
      const map = data.stageCharacterCompleted && typeof data.stageCharacterCompleted === "object" ? data.stageCharacterCompleted as Record<string, string[]> : {};
      const normalized: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(map)) {
        if (typeof k === "string" && Array.isArray(v)) normalized[k] = [...new Set(v.filter((x): x is string => typeof x === "string"))];
      }
      return { completedStageIds: [...new Set(ids)], stageCharacterCompleted: normalized, updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString() };
    }
  } catch {}
  return { completedStageIds: [], stageCharacterCompleted: {}, updatedAt: new Date().toISOString() };
}

function persist(state: LevelProgressState) {
  state.updatedAt = new Date().toISOString();
  try {
    uni.setStorageSync(LEVEL_PROGRESS_STORAGE_KEY, state);
  } catch {}
}

export const useLevelProgressStore = defineStore("levelProgress", () => {
  const state = ref<LevelProgressState>(readState());

  const completedStageIds = computed(() => state.value.completedStageIds);
  const completedCountByCategory = computed(() => {
    const counts: Record<string, number> = {};
    for (const id of state.value.completedStageIds) {
      const cat = id.split("-")[0] as string;
      // level1-stage-xx -> level1, radical-stage-xx -> radical
      const key = id.includes("radical") ? "radical" : id.startsWith("level1") ? "level1" : id.startsWith("level2") ? "level2" : id.startsWith("level3") ? "level3" : "unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  });

  function isStageCompleted(stageId: string): boolean {
    return state.value.completedStageIds.includes(stageId);
  }

  function getStageCompletedCount(stageId: string): number {
    return state.value.stageCharacterCompleted[stageId]?.length ?? 0;
  }

  function isCharacterCompletedInStage(stageId: string, characterId: string): boolean {
    return Boolean(state.value.stageCharacterCompleted[stageId]?.includes(characterId));
  }

  function markCharacterCompleted(stageId: string, characterId: string) {
    if (!stageId || !characterId) return;
    const list = state.value.stageCharacterCompleted[stageId] ?? [];
    if (list.includes(characterId)) return;
    state.value.stageCharacterCompleted = { ...state.value.stageCharacterCompleted, [stageId]: [...list, characterId] };
    persist(state.value);
  }

  function markStageCompleted(stageId: string) {
    if (!stageId || state.value.completedStageIds.includes(stageId)) return;
    state.value.completedStageIds = [...state.value.completedStageIds, stageId];
    persist(state.value);
  }

  function getStageProgress(stageId: string, total: number): number {
    if (total <= 0) return 0;
    if (isStageCompleted(stageId)) return 1;
    const done = getStageCompletedCount(stageId);
    return Math.min(1, done / total);
  }

  function resetStage(stageId: string) {
    if (!stageId) return
    const hadStage = state.value.completedStageIds.includes(stageId) || Boolean(state.value.stageCharacterCompleted[stageId])
    if (!hadStage) return
    const { [stageId]: _omitted, ...rest } = state.value.stageCharacterCompleted
    state.value.stageCharacterCompleted = rest
    state.value.completedStageIds = state.value.completedStageIds.filter((id) => id !== stageId)
    persist(state.value)
  }

  function hydrate() {
    state.value = readState();
  }

  return {
    completedStageIds,
    completedCountByCategory,
    isStageCompleted,
    getStageCompletedCount,
    isCharacterCompletedInStage,
    markCharacterCompleted,
    markStageCompleted,
    getStageProgress,
    resetStage,
    hydrate,
  };
});


