# 一级汉字字库

一级字表共 3500 个不重复文字，原始成员来自项目既有 `xz_2/src/data/tables/firstFrontTable.json`，快照保存为 `level1-characters.json`。

保留原 `firstLevel/1.json` 至 `13.json` 的 2557 字、ID 与顺序。`first-level-supplement.json` 补充其余 943 字，使用 `char-l1-` ID 前缀，顺序跟随完整一级字表。原关卡 1–256 及全部成员不变；第 256 关仍为原来的 7 字，补充文字另起第 257–351 关，最后一关为 3 字。每日 204 字与部首关卡保持原有范围。

补充字的拼音、笔画、部首和释义来自 [pwxcoo/chinese-xinhua 的 word.json](https://github.com/pwxcoo/chinese-xinhua/blob/master/data/word.json)，按 MIT 许可使用，许可全文见 `XINHUA-LICENSE.txt`。该公开字典含历史转码问题，`oldword` 不用于繁体字段；繁体采用 [OpenCC 的 STCharacters 单字映射](https://github.com/BYVoid/OpenCC/blob/master/data/dictionary/STCharacters.txt) 的首选字形，没有映射则保留原字。OpenCC（BYVoid 及贡献者）使用 Apache-2.0 许可，全文见 `OPENCC-LICENSE.txt`，字典快照见 `sources/OpenCC-STCharacters.txt`。单字存在一简多繁时，该字段只表示首选字形，不是上下文词组转换。字形结构、六书与说文未获得可靠对应原文，统一标记“未收录”，不生成伪造内容。

重新生成补充字表：先取得上述字典文件，再执行：

```sh
node build/completeLevelOne.mjs src/data/character-table/level1-characters.json /path/to/chinese-xinhua/data/word.json
```

构建与运行不访问该远程字典；已生成数据随应用离线分发。

## 完整通用规范字表与二三级课程

完整字表取自 [Unicode 16.0.0 Unihan.zip](https://www.unicode.org/Public/16.0.0/ucd/Unihan.zip) 的 `kTGH`（2013 年标准序号）。[Unicode UAX #38 对该字段的定义](https://www.unicode.org/reports/tr38/#kTGH)说明序号 1–3500 / 3501–6500 / 6501–8105 分属一级、二级、三级；[教育部字表说明](https://www.moe.gov.cn/jyb_xwfb/s271/202009/t20200915_488073.html)可交叉核验。核验结果：8105 字唯一，前 3500 字和相邻项目原一级字表完全同序，中间 3000 字和原二级字表完全同序。原一级 ID、351 关、部首代表字与第 256 关 7 字保持不变。

二级 3000 字 / 300 关，三级 1605 字 / 161 关。新字使用 `char-l2-` / `char-l3-` 稳定 ID。拼音使用 `kTGHZ2013`，笔画使用 `kTotalStrokes` 首个值；这些是固定版本的公开资料字段，并不声称是单一字体下的笔形判断。字形结构、六书和说文原文仍标记“未收录”。

中文释义和部首优先来自 [chinese-xinhua 固定提交 fe6d6c2e8baa82187f4c96bbe042e43f96c05666](https://github.com/pwxcoo/chinese-xinhua/tree/fe6d6c2e8baa82187f4c96bbe042e43f96c05666)，仅保留这次新增字所需的 3922 条记录到 `sources/additional-xinhua.json`。无对应中文释义时，使用带“Unihan 英文释义”标识的 `kDefinition`，仍无来源则显示“未收录”。不抓取商业字典或商业学习软件内容。繁体沿用已收录的 OpenCC 单字映射，未映射保持原字。

`sources/tgh-2013-unihan16.json` 保存所需 Unihan 字段的最小快照。Unicode 使用随附的 [Unicode License V3](sources/UNICODE-LICENSE.txt)，MIT 与 OpenCC Apache-2.0 许可沿用上文随附文件。

来源原文件 SHA-256：

- Unihan.zip：`b8f000df69de7828d21326a2ffea462b04bc7560022989f7cc704f10521ef3e0`
- 固定提交 word.json：`8ae3453eacc5b0f3fdfba47eac8bb686cd73914d278e8b851ae6ef81082f80e7`

从仓库内快照离线重新生成：`node build/completeCatalog.mjs`。首次从上述原文件提取快照：`node build/completeCatalog.mjs <解压的Unihan目录> <word.json>`。生成器核对字典哈希、8105 字唯一性、一级顺序以及拼音和笔画字段，失败时停止。
