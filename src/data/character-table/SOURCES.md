# 一级汉字字库

一级字表共 3500 个不重复文字，原始成员来自项目既有 `xz_2/src/data/tables/firstFrontTable.json`，快照保存为 `level1-characters.json`。

保留原 `firstLevel/1.json` 至 `13.json` 的 2557 字、ID 与顺序。`first-level-supplement.json` 补充其余 943 字，使用 `char-l1-` ID 前缀，顺序跟随完整一级字表。原关卡 1–256 及全部成员不变；第 256 关仍为原来的 7 字，补充文字另起第 257–351 关，最后一关为 3 字。每日 204 字与部首关卡保持原有范围。

补充字的拼音、笔画、部首和释义来自 [pwxcoo/chinese-xinhua 的 word.json](https://github.com/pwxcoo/chinese-xinhua/blob/master/data/word.json)，按 MIT 许可使用，许可全文见 `XINHUA-LICENSE.txt`。该公开字典含历史转码问题，`oldword` 不用于繁体字段；繁体采用 [OpenCC 的 STCharacters 单字映射](https://github.com/BYVoid/OpenCC/blob/master/data/dictionary/STCharacters.txt) 的首选字形，没有映射则保留原字。OpenCC（BYVoid 及贡献者）使用 Apache-2.0 许可，全文见 `OPENCC-LICENSE.txt`，字典快照见 `sources/OpenCC-STCharacters.txt`。单字存在一简多繁时，该字段只表示首选字形，不是上下文词组转换。字形结构、六书与说文未获得可靠对应原文，统一标记“未收录”，不生成伪造内容。

重新生成补充字表：先取得上述字典文件，再执行：

```sh
node build/completeLevelOne.mjs src/data/character-table/level1-characters.json /path/to/chinese-xinhua/data/word.json
```

构建与运行不访问该远程字典；已生成数据随应用离线分发。
