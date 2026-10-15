import type { StudyCharacterEntry } from "./types";

export type LevelCategory = "radical" | "level1" | "level2" | "level3";

export interface LevelCategoryMeta {
  key: LevelCategory;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  stageSize: number;
}

export const LEVEL_CATEGORIES: LevelCategoryMeta[] = [
  { key: "radical", label: "偏旁部首", shortLabel: "部首", description: "识部首 · 明结构", icon: "apps-o", stageSize: 10 },
  { key: "level1", label: "一级汉字", shortLabel: "一级", description: "常用字 · 打基础", icon: "records", stageSize: 10 },
  { key: "level2", label: "二级汉字", shortLabel: "二级", description: "进阶字 · 扩词汇", icon: "column", stageSize: 10 },
  { key: "level3", label: "三级汉字", shortLabel: "三级", description: "高阶字 · 拓视野", icon: "diamond", stageSize: 10 },
];

export interface LevelStage {
  id: string;
  category: LevelCategory;
  index: number;
  title: string;
  characters: StudyCharacterEntry[];
  isPlaceholder: boolean;
}

// 一级字表：聚合 src/static/character_table/firstLevel/ 下全部 JSON（用户明确该目录即完整一级表）
// 使用 Vite 的 import.meta.glob 静态聚合，兼容 H5/小程序构建；空文件与重复 id 自动过滤
const firstLevelModules = import.meta.glob("../static/character_table/firstLevel/*.json", { eager: true }) as Record<string, { default: { chars: StudyCharacterEntry[] } }>;

function loadFirstLevelChars(): StudyCharacterEntry[] {
  const entries = Object.entries(firstLevelModules);
  if (entries.length === 0) return [];
  // 按文件名数字排序，保证 1.json..12.json 顺序稳定
  const sorted = entries.sort(([a], [b]) => {
    const na = Number.parseInt(a.match(/\/(\d+)\.json$/)?.[1] ?? "0", 10);
    const nb = Number.parseInt(b.match(/\/(\d+)\.json$/)?.[1] ?? "0", 10);
    return na - nb;
  });
  const seen = new Set<string>();
  const result: StudyCharacterEntry[] = [];
  for (const [, mod] of sorted) {
    const raw: unknown = (mod as unknown as { default: unknown }).default ?? mod;
    const chars = (raw as { chars?: StudyCharacterEntry[] })?.chars;
    if (!Array.isArray(chars)) continue;
    for (const ch of chars) {
      const id = (ch as StudyCharacterEntry)?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      result.push(ch as StudyCharacterEntry);
    }
  }
  // 最终按 id 数值排序，保证跨文件整体递增且去重后稳定
  result.sort((a, b) => {
    const ai = Number.parseInt(a.id.replace(/\D/g, ""), 10);
    const bi = Number.parseInt(b.id.replace(/\D/g, ""), 10);
    return ai - bi;
  });
  return result;
}

const FIRST_LEVEL_CHARS: StudyCharacterEntry[] = loadFirstLevelChars();

function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) result.push(array.slice(i, i + size));
  return result;
}

function buildPlaceholderStages(category: LevelCategory, count: number, stageSize: number): LevelStage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: category + "-stage-" + String(i + 1).padStart(2, "0"),
    category,
    index: i + 1,
    title: "关卡 " + String(i + 1).padStart(2, "0"),
    characters: [],
    isPlaceholder: true,
  }));
}

// 一级：基于 firstLevel/ 聚合后的真实数据，10 字一关
const LEVEL1_STAGE_SIZE = 10;
const level1Chunks = chunk(FIRST_LEVEL_CHARS, LEVEL1_STAGE_SIZE);
export const LEVEL1_STAGES: LevelStage[] = level1Chunks.map((chars, idx) => ({
  id: "level1-stage-" + String(idx + 1).padStart(2, "0"),
  category: "level1",
  index: idx + 1,
  title: "关卡 " + String(idx + 1).padStart(2, "0"),
  characters: chars,
  isPlaceholder: false,
}));

// 偏旁部首：从一级汉字中提取高频部首聚合，展示部首维度学习
// 取出现频次前 30 的部首，每个部首用首字代表，共 3 关
const RADICAL_STAGE_SIZE = 10;
function buildRadicalStages(): LevelStage[] {
  const groups = new Map<string, StudyCharacterEntry[]>(); // radical groups
  for (const ch of FIRST_LEVEL_CHARS) {
    const key = (ch.structure as unknown as { radical_id: string }).radical_id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ch);
  }
  const sorted = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length).slice(0, 30);
  // 将部首按聚合大小排序后，每 10 个部首作为一关，关内展示该部首的代表字
  const radicalReps: StudyCharacterEntry[] = sorted.map(([, chars]) => chars[0]!);
  const chunks = chunk(radicalReps, RADICAL_STAGE_SIZE);
  return chunks.map((chars, idx) => ({
    id: "radical-stage-" + String(idx + 1).padStart(2, "0"),
    category: "radical",
    index: idx + 1,
    title: "关卡 " + String(idx + 1).padStart(2, "0"),
    characters: chars,
    isPlaceholder: false,
  }));
}
export const RADICAL_STAGES: LevelStage[] = buildRadicalStages();

// 二级/三级：暂无真实字表，展示占位关卡，提示敬请期待（保持布局一致，便于后续接入）
export const LEVEL2_STAGES: LevelStage[] = buildPlaceholderStages("level2", 15, 10);
export const LEVEL3_STAGES: LevelStage[] = buildPlaceholderStages("level3", 12, 10);

export const STAGES_BY_CATEGORY: Record<LevelCategory, LevelStage[]> = {
  radical: RADICAL_STAGES,
  level1: LEVEL1_STAGES,
  level2: LEVEL2_STAGES,
  level3: LEVEL3_STAGES,
};

export function getCategoryMeta(key: LevelCategory): LevelCategoryMeta | undefined {
  return LEVEL_CATEGORIES.find((c) => c.key === key);
}

export function getStage(category: LevelCategory, stageId: string): LevelStage | undefined {
  return STAGES_BY_CATEGORY[category]?.find((s) => s.id === stageId);
}

export function getAllStages(): LevelStage[] {
  return [...RADICAL_STAGES, ...LEVEL1_STAGES, ...LEVEL2_STAGES, ...LEVEL3_STAGES];
}
