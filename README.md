# mini-form-engine

> Schema 驱动的低代码表单引擎：把「表单长什么样」全部交给 Schema 描述，
> 把「字段此刻能不能编辑、该显示什么」交给一个多来源的状态决策引擎。

一个完整闭环的低代码表单方案，包含 **Runtime Core（引擎）**、
**Designer（可视化设计器）**、**Config Server（配置服务）** 和 **OA Demo（真实应用验证）** 四部分。

---

## 这个引擎解决什么问题

普通的动态表单只做「Schema → 渲染」。但真实的企业表单远不止渲染：

- 字段状态不只由 Schema 决定，还取决于**权限、审批流程节点、联动规则**
- 多来源冲突时，谁说了算？
- Schema 会迭代，**历史任务必须能打开它创建时的那一版**
- Schema 升级后，旧数据要能迁移

这个项目把这四件事都做成了引擎能力，而不是散落在业务代码里的 if/else。

## 核心能力

### 1. 多来源字段状态决策引擎

字段的最终状态由四个 Provider 共同决定，且有**明确的优先级**：

```text
Permission  >  BPM  >  Rule  >  Schema
（权限）      （流程）  （规则）  （Schema 基线）
```

- `permission-state-provider` —— 权限体系决定的可见性 / 可编辑性
- `bpm-state-provider` —— 当前审批节点决定的状态（例如：经理节点金额只读）
- `rule-state-provider` —— 联动规则计算出的状态
- `schema-state-provider` —— Schema 里声明的基线状态

`field-state-resolver` 负责仲裁并产出最终 `FieldState`。
把优先级显式建模，比把它藏在渲染顺序里可靠得多。

### 2. 依赖图与规则调度

- `dependency/dependency-graph.ts` —— 解析字段间的依赖关系，避免循环依赖与重复计算
- `scheduler/rule-scheduler.ts` —— 按依赖拓扑顺序调度规则求值，只重算受影响字段

### 3. Schema 版本与冻结

- `schema-version/schema-registry.ts` + `schema-version-resolver.ts`
- **版本冻结语义**：历史任务打开时，永远使用它创建时那一版 Schema，不受后续改版影响

### 4. 数据迁移管线

`migration/` 实现完整的迁移流程，而不是脚本硬改：

```text
Validation（五类校验器）
   → Report（迁移报告）
   → Dry Run（Before / After 预览）
   → Execution（Operation Log 可追溯）
```

### 5. 子表单

`subform/subform-core.ts` —— 子表单的结构、状态与校验接入主流程。

### 6. 渲染器解耦

`renderer/component-map.ts` + `vue-components.ts` —— 组件通过 ComponentMap 注册，
渲染器不感知具体 UI 库。这让同一套引擎可以对接不同组件库（Demo 里接的是 Element Plus）。

## 仓库结构

```text
mini-form-engine/
├── src/                      Runtime Core（引擎本体，零 UI 依赖）
│   ├── schema.ts              Schema 定义
│   ├── renderer/              组件映射与渲染配置
│   ├── runtime/               oa-runtime 运行时
│   ├── state-resolution/      ★ 多来源字段状态决策
│   ├── dependency/            ★ 依赖图
│   ├── scheduler/             ★ 规则调度
│   ├── schema-version/        ★ 版本注册与解析
│   ├── migration/             ★ 迁移管线
│   └── subform/               子表单
│
├── config-server/            配置服务（表单发布 / 元数据 / 校验 / 运行时配置下发）
├── designer-app/             可视化设计器（Vue3 + Element Plus + Vite）
│   ├── schema/               Schema 设计
│   ├── rule-designer/        规则设计
│   └── permission-designer/  权限设计
│
└── demo-app/                 企业 OA 演示应用（消费 Runtime Core）
    ├── layout/               布局
    ├── components/           FieldStatePanel / DebugDrawer / MigrationReportView
    ├── adapters/             ★ 接入层：Element Plus 组件注册、宿主语义适配
    └── stores/               运行时状态
```

### 关键的架构边界

**Demo 应用不复制任何核心实现。** Schema 解析、规则求值、依赖图、状态决策、
迁移校验与执行全部调用 Runtime Core；应用侧只通过 `adapters/` 接入：

- `element-component-registry.ts` —— 把 Element Plus 组件登记进核心 ComponentMap
- `host-components.ts` —— 宿主语义适配（例如 `readonly` 在数字组件上的差异）
- `runtime-engine.ts` / `config-gateway-client.ts` —— 运行时与配置服务的对接

这个边界是刻意守住的：**它证明引擎真的可以被别的应用复用，而不是和 Demo 长在一起。**

## 架构数据流

```text
Config Server（mock / 真实）
   │ schemaVersion / 任务节点 / 角色 / 权限
   ▼
SchemaVersion Resolver ──▶ Schema Registry ──▶ Schema 实例
                                                │
RuntimeContext（核心适配层拍平为 ctx.* 事实）    │
        │                                       ▼
        └──────────────▶ Rule / BPM / Permission Provider
                                │
                    State Resolution Engine
                    （Permission > BPM > Rule > Schema）
                                │
                         Final FieldState
                                │
Schema ─▶ ComponentMap ─▶ Renderer(buildRenderConfigs)
                                │
                          RuntimeForm
                                │
                          Element Plus UI
```

## Demo 应用演示了什么

| 页面 | 演示内容 |
|---|---|
| **我的申请** | 采购申请单由 Runtime Core 生成；右侧 FieldState Inspector 展示每个状态键**来自哪个 Provider** |
| **审批中心** | 员工填写 → 部门经理审批 → 财务审批 → 完成。切换节点实时重算字段状态：员工节点 `amount` 可编辑，经理/财务节点只读，金额 > 5000 显示 warning |
| **Schema 管理** | `orderForm` 的 v1 / v2 对比（`amount: NumberInput → MoneyInput`，新增 `currency`），演示版本冻结 |
| **数据迁移** | Validation → Report → Dry Run → Execution 完整管线，可切换「坏计划」查看 error 场景 |

右上角 **Runtime Debug** 面板（类 DevTools）：
FormData / Schema / RuntimeContext / Dependency Graph / Rule Trace / FieldState。

## 快速开始

```bash
# 引擎单测
npm install
npm test

# 设计器
cd designer-app && npm install && npm run dev

# OA 演示应用
cd demo-app && npm install && npm run dev     # http://localhost:5173
```

## 测试

**26 个测试文件**，覆盖引擎核心与两个应用，使用 Node 内置 `node:test`（通过 `tsx` 运行）：

- **引擎**：依赖图、规则调度、运行时、字段状态解析、子表单、Schema 版本、迁移与迁移执行
- **配置服务**：config-store、form-service、form-metadata、publish-service、
  runtime-config-client、validation
- **设计器**：Schema 树模型与构建、布局、栅格、规则模型与构建、权限模型与构建、designer store
- **演示应用**：Schema 共享逻辑

```bash
npm test          # 一次跑完引擎 + 配置服务 + 演示应用的全部单测
```

## 技术栈

`TypeScript` `Vue 3` `Vite` `Element Plus` `node:test` `tsx`

引擎本体（`src/`）零 UI 框架依赖，UI 通过 ComponentMap 注入。

## 当前状态

引擎核心、设计器、配置服务与演示应用已形成闭环。
尚未接入 CI 流水线，也未添加 LICENSE。

## 许可证

MIT
