# 本地数据库

App-vue 使用 HTML5+ `plus.sqlite`，数据库路径为 `_doc/font-learning.db`；H5 使用 IndexedDB，名称为 `font-learning`。不需要后端服务，也未引入 ORM 或新的运行时依赖。当前数据库结构版本为 1。

## 数据组织与读取

- `characters`：高频检索字段；汉字 ID 主键，简繁体、标准化拼音、级别与字序、部首与字序索引。
- `character_details`：说文、六书与非检索扩展信息；按 ID 加载，不参与搜索列表读取。
- `character_words`：组词；按汉字与词序、词语建立索引。
- `character_sets`：字单范围；`daily` 保留原 204 字每日字表。完整字库为 2557 字。
- `levels` / `level_characters`：关卡定义和有序字单；按分类与关序、关卡与字序检索。后段关卡可直接读取，无须依次加载前面的分片。
- `character_progress` / `character_mode_progress` / `character_actions`：长期状态、各模式进度、斩字历史；答题只更新变化的记录。
- `daily_sessions` / `daily_session_items`：每日会话和固定字单；日期使用原存储格式，保持迁移一致性。
- `stage_progress` / `stage_character_progress`：独立关卡完成情况，重置关卡不删除长期单字记录。
- `books` / `book_chunks` / `reading_progress`：书籍信息、16K UTF-16 单元左右的正文块、按书保存的字符偏移及排版位置。正文不在代理对中间分块。
- `settings`：主题、学习计划、字体元信息、个人资料、阅读偏好等少量配置。复杂配置序列化在数据库字段中，业务列表和学习记录不保存为整份 JSON 快照。
- `meta`：迁移完成标记、字库内容版本、恢复前快照。

书架只读取元信息，正文仅在打开该书时读取。现有阅读器仍需要全文进行排版测量，因此打开一本书时会分批读取并拼接其正文；本次没有改写分页算法。字体和 PDF 原资源继续以文件保存。

`searchCatalog` 默认保留原每日字表范围；文字搜索页使用 `all` 范围检索完整字库。两种范围分别缓存检索字段，沿用精确、前缀、包含、组词、释义的匹配排序，结果每批 50 条，不在普通搜索中加载长详情。多个汉字或简繁体字组通过索引精确匹配，并按用户输入顺序返回；未收录的文字单独反馈。普通 B-tree 索引不能加速任意包含匹配；当前规模未引入 FTS。

字形比较最多保存 6 个单字 ID，存于 `settings` 的 `morning-pages:character-comparison` 项。字形、拼音、结构、释义仍从字库读取，字体和配色使用原有全局设置，不复制字库内容，也不写入学习完成记录。

最近选择的关卡沿用 `settings` 的 `morning-pages:last-level-study` 项和原有字段，以兼容已有记录；其中 `studiedAt` 现在表示选择时间。点击卡片、打开预览、棋盘点选或闪卡选关即保存，不等待开始练习，也不写入答题或完成进度。重复加载同一预览不重复保存；默认展示、自动翻组和待上线关卡不覆盖选择。启动时会通过字库校验目标关卡，无效、已删除或待上线的关卡不会作为最近选择恢复。

## 内置字库与升级

源文件移到 `src/data/character-table/`，不再作为 static 资源重复分发。`build/catalogPlugin.ts` 构建以下文件：

- `static/database/catalog-version.txt`：内容哈希。
- `static/database/catalog-seed.json`：首次初始化或内容版本变化时导入数据库的种子数据。

运行时页面不直接导入或请求原字表 JSON。首次导入及内容替换使用事务；内容版本更新只替换内容表，保留全部用户表。JSON 仍用于构建种子和用户主动导出的便携备份，不用于日常业务持久化。

数据库结构升级与内容升级分开。未来修改 schema 时，应增加 `DATABASE_VERSION` 并实现对应的 SQLite / IndexedDB 迁移；不能仅修改列定义。App 拒绝打开比当前应用版本更新的数据库。

## 旧数据迁移与错误

首次打开会读取旧 uni Storage 及原 `morning-pages/settings` IndexedDB，迁移学习记录、收藏、斩字、历史每日会话、关卡进度、书籍与阅读位置、字体及其他设置。成功提交后才写 `legacy-v1` 标记；原存储不删除，后续运行以新数据库为准。修改旧 Storage 不会覆盖已迁移的数据。

初始化失败时阻止业务操作并提供重试。写入按队列提交，失败批次保留在内存中，页面显示“重试保存”；成功重试后才清除。应用进入后台时尝试提交队列。操作系统强杀应用前尚未完成的提交不能保证保留。

App 打开数据库前通过 `plus.sqlite.isOpenDatabase` 同时检查名称和路径，复用已打开的原生连接，避免 HBuilderX 重载后 JS 缓存重置导致 `Same Name Already Open`。打开失败时也会重新确认目标连接，未确认打开的错误仍正常上报；结构初始化失败会等待原生连接关闭完成后再返回错误，确保后续重试不与关闭操作竞争。

## 备份恢复

设置页提供导出和恢复：H5 下载 / 选择 JSON 文件；App 保存独立文件到 `_doc` 并显示路径，可填写可访问的备份路径恢复。App 内备份需要另存副本才能用于卸载、清除数据或换机后的恢复。

备份包含记录、设置、书籍元信息及上传书籍正文，不包含独立字体文件或内置资源。恢复前验证格式、表名、字段及书籍正文关联；在一个事务内替换用户表，同时在 `meta/before-restore-backup` 保留恢复前快照。基础字库不随用户备份覆盖。

## 验证

```sh
pnpm type-check
pnpm test
pnpm build:h5
pnpm build:app
pnpm exec playwright test e2e/database.spec.ts e2e/levels.spec.ts e2e/reading-position.spec.ts --workers=1
```

也可以先构建 H5，再对生产产物运行浏览器测试：

```sh
pnpm exec playwright test --config playwright.build.config.ts e2e/database.spec.ts e2e/levels.spec.ts e2e/reading-position.spec.ts --workers=1
```

原 `navigation.spec.ts` 使用开发环境全局 `uni.addInterceptor`，应通过默认开发配置运行。原生适配单元测试在 Node 内置 SQLite 上验证实际 SQL、事务与桥接回调；不代表 Android 真机验证。设备上仍需确认 SQLite 基座、首次导入耗时、升级保留数据、后台写入以及本地备份文件读写。
