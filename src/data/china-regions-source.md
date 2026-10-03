# 中国省市区县数据来源

- 来源：[`uiwjs/province-city-china`](https://github.com/uiwjs/province-city-china)
- 文件：`gh-pages/level.min.json`
- 获取日期：2026-10-02
- 范围：34 个省级行政区，以及数据源提供的地级、县级行政区
- 许可：MIT License

`china-regions.json` 保留上游压缩字段，以减少前端包体；`src/regions/chinaRegions.ts` 负责运行时校验并转换为项目内的明确类型。台湾省在上游数据中没有下级区县，因此地区页只能选择到省级。
