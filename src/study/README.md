# 正式学习模块设计

## 完成规则

运行时从本地数据库读取文字资源。`character_sets` 中的 `daily` 集合保留原每日字表的 204 字范围与顺序；关卡来自完整的 2557 字字库，保留原关卡 ID 与字序。JSON 位于 `src/data/character-table/`，仅作为构建时的内置字库来源。每日字单生成后写入当天进度，退出或刷新不会重新抽取。每个文字默认依次完成以下三种练习；实际完成判断以计划中启用的练习模式为准：

1. 查看学习字体，选择对照字体；
2. 查看对照字体，选择学习字体；
3. 查看学习字体，输入对应文字。

错误答案只累计尝试与错误次数，不会完成该模式。当天选字跳过已经完成或处于“斩”状态的文字；对已进入当天字单的文字执行“斩”不会删除当天或历史进度。

## 关卡预览与学习

关卡预览和今日预览共用 `StudyPreviewPanel`，默认遮盖对照字体，支持逐字揭示、交换遮盖字体和全部揭示/遮盖。关卡预览始终保留本关全部文字，可直接斩字，也可打开文字详情。斩字按钮激活后显示“已斩”，再次点击即可取消斩字并恢复参与学习；斩字与取消状态刷新或重新进入后仍生效，原有学习记录保留。已斩文字继续留在预览列表中，但不会出现在练习题或干扰选项中；文字详情中的斩字操作与预览同步。

关卡只统计未斩文字的练习与完成进度，全部斩掉时禁用开始学习，不将其计为完成。答题按钮关闭原生按压高亮、缩放、变暗及过渡，点击答案后直接显示结果：答对触发绿色确认动画和文字提示；答错立即变红并显示错误提示，配合 360 毫秒、幅度 3px 的一次轻晃，输入题同样生效。错误记录在反馈结束后按顺序保存，避免同步存储挡住第一帧；快速改选正确答案、重置、切到后台或离开页面时会先保存积压记录。答对后保留 150 毫秒反馈再直接展示详情，不再延迟播放详情滑入动画；连续第二次答错时先完成 360 毫秒的红色反馈再展示详情。切换等待期间锁定重复提交；完成所有已选模式后才将该字计为完成。错误后查看详情的题目仍需答对，走到题单末尾时会返回未完成的题。

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

每日会话按日期存储在 `daily_sessions`，固定字单及完成情况保存在 `daily_session_items`。单字长期记录由 `character_progress`、`character_mode_progress` 和 `character_actions` 保存。旧 `font-learning-daily-progress:<dateKey>` 等 Storage 键仅用于首次迁移，原值会保留供恢复。
