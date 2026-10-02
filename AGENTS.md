# AGENTS.md — Vue 组件开发规范（AI 编码协作约束文件）

> **适用范围（重要）**：本规范**仅对 Vue 项目生效**。
> 仅当代码属于 Vue 项目（存在 `.vue` 文件、`vue` 依赖）时才适用本文件全部规则；
> **非 Vue 代码（纯 JS/TS 工具库、Node 脚本、其他框架项目等）不适用本规范，不要套用。**

## 0. 执行约定

- 生成或修改任何 Vue 组件代码前，必须先通读并严格遵守本文件全部规则。
- 遇到与本规范冲突的历史代码，以本文件为准，并给出渐进迁移建议。

---

## 1. 硬性红线（必须遵守）

1. 一律使用 **Vue 3 + `<script setup>` + TypeScript**，禁止使用 Options API（维护遗留代码除外）。
2. 禁止使用 Vue 2 的 API 与写法（`this.$set`、`$refs` 直接改值、过滤器 `|`、`.sync`、`.native`）。
3. **超过 300 行（不含 import）必须拆分为子组件、composable 或工具函数**；单组件目标控制在 300 行以内。
4. 每个文件只做一件事：一个 SFC = 一个职责单一的组件。
5. 禁止在模板中写复杂表达式；三目超过一层、超过 2 个逻辑运算符时，必须提取为 computed。
6. 禁止 `v-for` 与 `v-if` 写在同一元素上（性能与可读性问题）。
7. 禁止修改 props（props 只读，需要派生用 computed，需要回写用 emit）。
8. 所有异步副作用必须有错误处理（try/catch 或 `.catch`），禁止裸 Promise。

---

## 2. 文件组织

### 2.1 SFC 块顺序（固定）

```vue
<script setup lang="ts">  →  <template>  →  <style scoped lang="scss">
```

- 逻辑在前，结构居中，样式收尾；样式默认 `scoped`，全局样式必须单独说明理由。

### 2.2 script 内部顺序（固定）

```javascript
imports → 类型/常量 → props → emits → 状态与 refs → computed → watch → 生命周期 → 方法 → 暴露(defineExpose)
```

- `watch` 默认使用 `{ deep: false }`，需要深度监听必须注释原因。
- 生命周期钩子集中放置，`onUnmounted` 中必须清理：定时器、事件监听、第三方实例（图表、编辑器等）等。

### 2.3 命名约定

| 对象 | 规则 | 示例 |
| --- | --- | --- |
| 组件文件名 | PascalCase | `UserCard.vue` |
| 子目录名 | kebab-case | `user-card/` |
| composable | `use` 前缀，camelCase | `useUserList.ts` |
| props / emits | camelCase（模板内 kebab-case 自动转换） | `pageSize` / `update:page` |
| 事件名 | 动词或动词短语 | `onItemAdded` |
| 常量 | SCREAMING_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |

---

## 3. 组件设计

### 3.1 Props 定义

- 所有 props 必须**显式声明类型**，并尽量给出默认值：

```ts
const props = withDefaults(defineProps<{
  title: string
  pageSize?: number
  readonly?: boolean
}>(), { pageSize: 20, readonly: false })
```

- props 数量超过 **7 个**时，考虑改为 `options` 对象或拆分组件。
- 复杂对象 prop 必须配合 `PropType` 或接口定义，禁止 `any`。

### 3.2 Emits 与 v-model

- 使用 `defineEmits` 显式声明事件及参数类型：

```ts
const emit = defineEmits<{
  (e: 'update:page', val: number): void
  (e: 'item-click', item: UserItem): void
}>()
```

- 自定义 `v-model` 命名遵循 `modelValue` / `update:modelValue` 或具名 `xxx` / `update:xxx` 规范。

### 3.3 状态管理边界

- **组件内私有状态** → `ref` / `reactive`
- **跨组件但同页面** → 提升到最近公共祖先，或 provide/inject（仅限父子层级）
- **跨页面 / 全局** → Pinia store
- 禁止组件之间直接互相调用方法（通过 props 下传、emit 上抛，或用 store 中转）。

---

## 4. 拆分规则（判断标准）

出现以下任一情况，必须拆分，即使行数未超 300：

1. 模板嵌套层级超过 4 层；
2. 某个 `computed` 或方法超过约 30 行；
3. 一段模板在视觉上是独立区块（卡片、表单分组、工具栏）；
4. 一段逻辑不依赖模板 DOM（数据获取、格式化、业务计算）→ 抽成 composable 或 `utils/`；
5. 同一组件被多处复用，但调用方只用到了其中一部分 props —— 说明职责混杂。

拆分优先级：**子组件（视觉/交互区块）→ composable（状态逻辑）→ 工具函数（纯计算）**。

---

## 5. 性能规则

1. 大列表必须 `v-memo` 或虚拟滚动（如 `vue-virtual-scroller`），禁止裸渲染万级节点。
2. 高频触发的事件（scroll、resize、input 等）必须**节流/防抖**（lodash-es 或手写），并在 `onUnmounted` 中取消。
3. `computed` 内不做 IO、不发请求；网络请求放 `onMounted` 或事件回调。
4. 组件懒加载：路由组件一律 `() => import(...)`；非首屏大组件用 `defineAsyncComponent`。
5. 避免不必要的响应式：`shallowRef` / `shallowReactive` 用于大对象（如第三方实例、表格数据），**禁止把第三方实例（图表、编辑器等）放入深响应式**。

---

## 6. 代码风格

- 使用 ESLint（`eslint-plugin-vue` + `@vue/eslint-config-typescript`）+ Prettier，**禁用未使用的变量**（`no-unused-vars` error）。
- 禁止使用 `any`；确实无法推断时用 `unknown` 并收窄。
- 模板属性顺序：`v-if` → `v-for` → 静态属性 → 动态绑定 → 事件。
- 条件渲染优先 `v-if`（低频切换），`v-show` 仅限频繁切换。
- 注释解释"为什么"，不复述代码本身。

---

## 7. AI 生成代码的自检清单

每生成/修改一个组件后，AI 必须自查：

- [ ] 本次修改是否属于 Vue 项目代码？（非 Vue 代码不适用本规范）
- [ ] 单文件是否 ≤ 300 行？超限是否已给出拆分方案？
- [ ] 是否全部使用 `<script setup lang="ts">`？
- [ ] props 是否类型完整、有默认值、只读？
- [ ] emits 是否显式声明？事件名是否符合规范？
- [ ] 是否有未清理的定时器 / 事件监听 / 第三方实例？
- [ ] 模板中是否存在复杂表达式、同元素 v-if+v-for？
- [ ] 是否存在 `any`、未处理 catch 的 Promise？
- [ ] 高频事件是否有节流/防抖？

---

> 维护说明：本规范随项目演进更新；与旧代码冲突时，以本文件为准，遗留代码可逐步迁移。
