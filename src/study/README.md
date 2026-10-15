# 正式学习模块设计

## 完成规则

`first-level.json` 是当前唯一文字资源。每日字单生成后写入当天进度，退出或刷新不会重新抽取。每个文字必须依次完成以下三种练习，三项均答对后才计入当天“已新学”：

1. 查看学习字体，选择对照字体；
2. 查看对照字体，选择学习字体；
3. 查看学习字体，输入对应文字。

错误答案只累计尝试与错误次数，不会完成该模式。当天选字跳过已经完成或处于“斩”状态的文字；对已进入当天字单的文字执行“斩”不会删除当天或历史进度。

## 持久化数据

单字长期数据使用 `font-learning-character-data`，当前版本为 `2`：

```ts
interface CharacterLearningData {
  version: 2
  updatedAt: string
  characters: Record<string, {
    characterId: string
    status: 'not-started' | 'learning' | 'completed'
    firstStartedAt: string | null
    lastStudiedAt: string | null
    completedAt: string | null
    favorite: { active: boolean; changedAt: string | null }
    slash: {
      active: boolean
      changedAt: string | null
      history: Array<{ action: 'slash' | 'restore'; at: string }>
    }
    modes: Record<StudyMode, {
      attempts: number
      mistakes: number
      firstAttemptAt: string | null
      lastAttemptAt: string | null
      completedAt: string | null
    }>
  }>
}
```

三种模式使用稳定 ID，而不是展示文案作为存储键。旧 `font-learning-character-preferences` 中的 `favoriteIds` 和 `excludedIds` 会在首次读取时迁移。

每日会话继续按日期存储在 `font-learning-daily-progress:<dateKey>`，包括固定的 `assignedIds`、已完成的 `learnedIds`、当前文字、学习秒数和起止时间。单字长期记录负责精细进度，每日会话负责当天计划与首页汇总，二者职责分离。
