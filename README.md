# 灵光一闪 AI创意工坊

AI 驱动的网文写作辅助工具：从一句话灵感出发，生成三个世界观方向，进入可编辑大纲，并通过理论引擎检测帮你发现故事可能崩盘的地方。

## 当前状态

- 当前已达到“内部试用版”门槛：灵感引爆、方案选择、长篇卷纲、大纲编辑、理论诊断、AI 补全、保存、快照和 Markdown 导出已经形成闭环。
- 当前 V2 主线目标是“可公开小范围试用版”：从小点子推进到可开书的前 30 章准备包。
- `V2-1.5` 与 `V2-1.6` 已完成：7 个连载卷可以继续拆成卷内阶段，阶段节点支持编辑、迁移、保存、快照和 Markdown 导出。
- `WorldState-1` 已完成基础模型：项目现在可以保存事实、关系、伏笔和状态事件，并把卷内阶段的 `stateChange` 纳入计划事件流。
- `V2-2.1` 已完成：主角节点支持姓名/身份、底层欲望、开场困境、成长弧线和关键关系字段，并同步到世界状态。
- `V2-2.2` 已完成：反派/压力源节点支持开局压力源、阶段 boss、制度/势力压力、终局对手和压力升级方式，并同步到世界状态。
- `V2-2.3` 已完成：金手指节点支持能力核心、限制条件、使用代价、升级方式和失控风险，并同步到世界状态。
- `V2-4.1` 已完成：项目支持前 30 章节奏表字段模型，章节包含读者问题、场景任务、爽点/压迫、章末钩子、依赖事实和状态变化。
- `V2-4.2` 已完成：工作台支持编辑前 30 章节奏表，并可手动触发 AI 生成初版章节计划。
- `V2-3.1` 已完成：理论诊断能引用主角、压力源、金手指和前 30 章字段证据，理论解释也会接收本地证据。
- `V2-3.2` 已完成：理论样例扩展到 10 组，右侧默认只展示最值得处理的前 5 条诊断。
- `V2-3.3` 已完成：理论诊断通过 10 组样例做默认排序试用，纯关键词命中不再进入默认重点诊断。
- `V2-5.1` 已完成规划：前三章正文将按“计划取材、手写或单章 AI 生成、编辑检查、作者确认状态、保存导出”形成最小闭环。
- `V2-5.2` 已完成：前三章正文草稿模型、默认迁移、保存、快照和 Markdown 导出链路已打通。
- `V2-5.3` 已完成：工作台可切换编辑前三章、对照当前章计划、自动保存，并运行不消耗 token 的本地检查。
- `V2-5.4` 已完成：前三章支持按当前章手动调用真实 AI 生成正文，组装相关事实、字段和前章承接；失败保留原稿，不用 mock 冒充正文。
- `V2-5.5` 已完成：作者可确认当前章，把本章状态变化写入世界状态；再次编辑会自动撤回确认，后续章节生成只读取已确认事件。
- `V2-5.6` 已完成：本地检查中的篇幅、钩子、压力和状态变化缺口可单独请求真实 AI 补写，候选经人工采纳后才写入正文。
- 当前最近推进项是 `V2-Trial-1`：前三章连续试写与局部补写人工回归；结构回归已通过，真实作者回归待填写。
- 真实 LLM 通过服务端代理接入，支持 OpenAI 兼容网关；Claude / Ollama 目前只保留适配器类型，尚未完成真实实现。
- V1 仍是本地优先的单用户工具，数据默认保存在浏览器 IndexedDB。
- 当前不承诺完整千章管理、云同步、完整 30 理论引擎、完整 IP 相似度检测、完整版本历史或自动维护世界状态。

## 核心功能

### 味觉测试
首次进入应用时，AI 会生成 6 段原创网文开篇样本，覆盖不同网文口味：快节奏爽文、慢热铺垫、情绪拉扯、信息差悬疑、底层逆袭、轻松日常。通过喜欢/不喜欢完成判断，系统生成你的阅读偏好画像，后续 AI 生成内容将贴合你的口味。

### 灵感引爆
输入一个词、一句话或一个意象，AI 会生成 3 个世界观方案：
- **偏好方案**：贴合你的阅读偏好
- **反差方案**：与偏好相反但逻辑自洽
- **脑洞方案**：更跳脱、更有反差感

每个方案包含标题、核心概念、力量体系、冲突类型、情绪曲线等完整设定。

### 大纲编辑器
三栏结构设计：
- **左侧**：大纲树导航，支持故事基底、7 个连载卷纲节点、伏笔回收和最近快照
- **中间**：当前节点编辑区，支持 AI 补全
- **右侧**：理论诊断、网文质检和读者情绪目标

### 理论检测引擎
V1 首批接入 8 个基础理论引擎，实时检测大纲质量：

| ID | 学术名 | 老书虫白话版 | 检测重点 |
|:---|:---|:---|:---|
| T01 | 三幕剧/英雄之旅 | 故事别半路跑偏 | 检查大纲是否有开局、升级、转折、决战、收束 |
| T02 | 施耐德救猫咪 | 开场让读者心疼主角 | 检查主角开场是否有共情动作、困境或压迫感 |
| T03 | 麦基鸿沟 | 期望落空才有故事 | 检查关键节点是否存在"想要"和"现实"的落差 |
| T04 | 契诃夫之枪 | 前面挂了枪后面就得响 | 检查伏笔是否有计划回收 |
| T07 | 爽点三循环 | 憋屈→准备→爆发→收获→新危机 | 检查爽点是否形成循环 |
| T11 | 麦克斯韦妖/熵增 | 外挂开太大要付代价 | 检查金手指是否有代价、限制或反噬 |
| T12 | 边际效用递减 | 别让主角连着装同样的逼 | 检查连续爽点是否重复 |
| T13 | 生态位法则 | 每个势力都得有存在的理由 | 检查势力、资源、力量体系是否有位置和冲突 |

完整理论库包含 30 条网文写作理论，涵盖结构力学、节奏动力学、体系经济学、角色心理学、冲突设计学、设定创新学六大类别。

### 情绪节拍器
每个大纲节点都标注了预期读者情绪目标（爽、虐、悬疑、期待、紧张等）和强度，帮助你规划故事的情绪曲线。

### 网文质检清单
本地规则检查开头抓人、章末追读、场景可写、连载承接 4 个维度，不额外消耗 token。

### 相似设定风险提示
从用户设定中抽取关键词，命中本地相似设定提示表时显示撞味风险，建议强化核心差异点。

### 项目快照
支持手动保存项目快照，可随时恢复到历史版本，数据存储在本地 IndexedDB。

### 项目级世界状态基座（V2）
`WorldState-1` 先提供可保存、可迁移、可查询的最小结构，不直接替作者自动补设定：

- **基础事实**：人物、势力、地点、物品、能力、规则等实体及当前状态。
- **关系与势力**：盟友、敌对、隶属、师徒、亲属、竞争、债务等关系。
- **伏笔与后果**：开放、已解决或放弃的伏笔，附带触发条件和计划兑现。
- **状态变化事件**：卷内阶段的 `stateChange` 先进入 `planned` 事件；作者确认后可保留为 `confirmed`，后续同步不会覆盖。

旧项目打开或保存时会自动补齐状态结构，已有作者数据优先保留。当前版本暂不提供独立世界状态面板、不做自由文本自动抽取，也不会在写作时强制阻断作者。

### 主角字段模型（V2）
主角节点新增 5 个结构化字段：姓名 / 身份、底层欲望、开场困境、成长弧线、关键关系。字段会随项目保存、快照和 Markdown 导出保留，并同步成 `worldState.entities` 里的 `protagonist-main`。

### 压力源链字段模型（V2）
反派 / 压力源节点新增 5 组结构化字段：开局压力源、阶段 boss、制度 / 势力压力、终局对手和压力升级方式。其中前 4 组都可绑定出场卷或阶段，避免开局就把终极反派写死。字段会随保存、快照和 Markdown 导出保留，并同步成 `worldState.entities` 里的压力源事实。

### 金手指字段模型（V2）
金手指 / 力量体系节点新增 5 个结构化字段：能力核心、限制条件、使用代价、升级方式、失控风险。字段会随保存、快照和 Markdown 导出保留，并同步成 `worldState.entities` 里的能力与规则事实，避免后续章节生成时变成无成本万能外挂。

### 前 30 章节奏表（V2）
项目新增 `openingChapterPlan`，包含 30 条章节记录。每章保留读者问题、场景任务、爽点/压迫、章末钩子、依赖事实和状态变化。工作台中可编辑这些章节字段，也可以手动触发 AI 生成初版前 30 章计划；失败时会使用本地模板兜底，不写整章正文。

### 前三章正文试写规划（V2）
`V2-5.1` 已明确正文最小闭环：只覆盖第 1-3 章，正文草稿与章节计划独立保存。`V2-5.2` 落地了 `openingChapterDrafts` 数据模型和保存/导出链路；`V2-5.3` 提供三章切换、手写、防抖自动保存、计划过期提醒和本地检查；`V2-5.4` 已接入“单章手动真实生成”，只组装当前章计划、相关事实、主角/压力源/金手指字段和前章结尾；`V2-5.5` 已补齐“确认当前章 -> 世界状态写回 -> 再次编辑自动撤回”的闭环；`V2-5.6` 允许针对单个本地检查缺口生成局部候选，人工采纳后才写入正文并保存快照。当前仍不自动抽取新增事实，也不扩到第 4-30 章正文。

### 理论诊断证据化（V2）
理论检测结果现在会携带结构化证据：大纲正文、字段化设定、前 30 章计划和明确缺口。右侧卡片保持折叠态简洁，默认只露出最值得处理的前 5 条诊断，展开后展示“问题、位置、建议改法、证据”；理论解释仍按需调用 AI，并会把这些本地证据作为输入。

### V2-Trial-1：前三章连续试写与局部补写人工回归
工程结构回归已通过，但真实作者体验仍需用至少两个差异题材项目人工验证。回归重点是前三章连续承接、局部补写质量、保存/快照/导出和 AI 调用可见性；结构脚本不调用真实 LLM，也不代替人工判断文本质量。

### Markdown 导出
一键导出完整大纲和已存在的世界状态记录为 Markdown 文件，便于在其他编辑器中继续创作。

## 技术栈

- **框架**：Next.js App Router
- **语言**：TypeScript 5.6+
- **存储**：IndexedDB
- **图标**：Lucide React
- **适配层**：LLM Adapter Layer（支持 OpenAI 及兼容网关）
- **PWA 基座**：Manifest + Service Worker；完整安装体验暂缓

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 即可使用。首次进入会触发味觉测试，完成后进入项目列表。

## 配置

复制 `.env.example` 为 `.env.local`，根据需要配置：

```env
# LLM 提供者：openai
LLM_PROVIDER=openai

# OpenAI 兼容网关地址
LLM_BASE_URL=https://api.openai.com/v1

# API Key（必填，否则使用 mock 模式）
LLM_API_KEY=your-api-key

# 模型名称
LLM_MODEL=gpt-4.1-mini

# 请求超时时间（毫秒）
LLM_TIMEOUT_MS=90000

# 是否使用 mock 模式（开发测试用）
LLM_USE_MOCK=true
```

**注意**：当 `LLM_API_KEY` 为空或 `LLM_USE_MOCK=true` 时，应用会使用本地 mock 数据，不调用真实 AI。

## 脚本命令

| 命令 | 说明 |
|:---|:---|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run typecheck` | 类型检查 |
| `npm run acceptance:v1` | V1 验收冒烟测试 |
| `npm run acceptance:v2` | V2 卷纲字段冒烟测试 |
| `npm run acceptance:world-state` | WorldState-1 世界状态模型冒烟测试 |
| `npm run acceptance:protagonist` | V2-2.1 主角字段模型冒烟测试 |
| `npm run acceptance:pressure-source` | V2-2.2 压力源链字段模型冒烟测试 |
| `npm run acceptance:golden-finger` | V2-2.3 金手指字段模型冒烟测试 |
| `npm run acceptance:opening-plan` | V2-4.1 前 30 章字段模型冒烟测试 |
| `npm run acceptance:opening-drafts` | V2-5.2 前三章草稿保存链路冒烟测试 |
| `npm run acceptance:opening-editor` | V2-5.3 正文编辑与本地检查冒烟测试 |
| `npm run acceptance:opening-generation` | V2-5.4 单章真实正文生成与上下文组装冒烟测试 |
| `npm run acceptance:opening-confirmation` | V2-5.5 章节确认、世界状态回写与撤回链路冒烟测试 |
| `npm run acceptance:opening-gap-fill` | V2-5.6 正文缺口局部补写与人工采纳冒烟测试 |
| `npm run acceptance:v2-trial-1` | V2-Trial-1 前三章连续试写结构回归（不调用真实 LLM） |
| `npm run theory:eval` | 理论引擎评估测试 |

## 项目结构

```
spark-workshop/
├── public/                    # 静态资源
│   ├── icon.svg
│   ├── manifest.webmanifest  # PWA 配置
│   └── sw.js                 # Service Worker
├── scripts/                  # 测试脚本
│   ├── run-theory-eval.mjs
│   ├── run-golden-finger-fields-smoke.mjs
│   ├── run-opening-chapter-plan-smoke.mjs
│   ├── run-pressure-source-fields-smoke.mjs
│   ├── run-protagonist-fields-smoke.mjs
│   ├── run-v1-acceptance-smoke.mjs
│   ├── run-v2-serial-arc-smoke.mjs
│   └── run-world-state-smoke.mjs
├── src/
│   ├── app/                  # Next.js 应用路由
│   │   ├── api/llm/          # LLM API 端点
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/           # UI 组件
│   │   ├── CreativeWorkbench.tsx   # 创意工作台主组件
│   │   ├── OutlineEditor.tsx       # 大纲编辑器
│   │   ├── TheoryCheckerPanel.tsx  # 理论检测面板
│   │   ├── TasteTestPage.tsx       # 味觉测试页
│   │   ├── WelcomePage.tsx         # 欢迎页
│   │   └── ...
│   ├── lib/                  # 业务逻辑
│   │   ├── llm/              # LLM 适配层
│   │   │   ├── adapters.ts       # 适配器
│   │   │   ├── client-provider.ts # 客户端提供者
│   │   │   ├── mock-provider.ts  # Mock 提供者
│   │   │   └── server-provider.ts # 服务端提供者
│   │   ├── prompts/          # 提示词模板
│   │   ├── storage/          # 存储层
│   │   ├── theory-library.ts # 理论库定义
│   │   ├── theory-checker.ts # 理论检测逻辑
│   │   ├── emotion-goals.ts  # 情绪目标定义
│   │   ├── world-state.ts    # 世界状态模型、迁移和查询
│   │   └── export-markdown.ts # Markdown 导出
│   └── types/                # 类型定义
│       └── product.ts
├── .env.example
├── package.json
├── tsconfig.json
└── next.config.mjs
```

## LLM 适配层

应用通过抽象层支持多种 LLM 提供者，核心能力包括：
- `generateTasteSamples`: 生成味觉测试样本
- `analyzeTastePreference`: 分析用户阅读偏好
- `igniteSeed`: 引爆灵感生成世界观方案
- `enhanceOutlineNode`: AI 补全大纲节点
- `generateOpeningChapterPlan`: 生成前 30 章节奏表
- `generateOpeningChapterDraft`: 生成当前章正文草稿
- `fillOpeningChapterGap`: 针对一个本地检查缺口生成局部正文候选
- `explainTheoryCheck`: 解释理论检测结果

当前真实链路优先支持 OpenAI-compatible Chat Completions。其他 provider 类型用于后续扩展，不代表已经可用。

## 数据存储

所有数据存储在浏览器本地 IndexedDB，无需云端同步：
- **preferences**: 用户阅读偏好
- **projects**: 项目列表与大纲数据
- **snapshots**: 项目版本快照

项目数据中的 `worldState` 当前包含：

- `entities`：基础事实实体
- `relations`：实体关系
- `foreshadowings`：伏笔与后果
- `events`：状态变化事件

## 浏览器兼容性

- Chrome/Edge 90+
- Firefox 89+
- Safari 15+

## 开发说明

### 启用真实 AI

1. 复制 `.env.example` 为 `.env.local`
2. 设置 `LLM_API_KEY` 为你的 API Key
3. 设置 `LLM_USE_MOCK=false`
4. 重启开发服务器

### Mock 模式

默认使用 Mock 模式，不消耗 API 额度，适合开发测试。Mock 数据在 `src/lib/llm/mock-provider.ts` 中定义。

## V1 验收与 V2 规划

- 产品阶段目标：`../outputs/产品阶段目标与发布门槛.md`
- V1 自动回归：`npm run acceptance:v1`
- V2 卷纲字段回归：`npm run acceptance:v2`
- WorldState-1 回归：`npm run acceptance:world-state`
- V2-2.1 主角字段回归：`npm run acceptance:protagonist`
- V2-2.2 压力源链字段回归：`npm run acceptance:pressure-source`
- V2-2.3 金手指字段回归：`npm run acceptance:golden-finger`
- V2-4.1 前 30 章字段模型回归：`npm run acceptance:opening-plan`
- V2-5.2 前三章草稿回归：`npm run acceptance:opening-drafts`
- V2-5.3 正文编辑与本地检查回归：`npm run acceptance:opening-editor`
- V2-5.4 单章真实正文生成回归：`npm run acceptance:opening-generation`
- V2-5.5 章节确认与世界状态回写回归：`npm run acceptance:opening-confirmation`
- V2-5.6 正文缺口局部补写回归：`npm run acceptance:opening-gap-fill`
- V2-Trial-1 结构回归：`npm run acceptance:v2-trial-1`
- V1 理论样例：`npm run theory:eval`
- V1 收口记录：`../outputs/V1-Acceptance-3-内部试用回归记录.md`
- V2 规划：`../outputs/V2-产品规划.md`
- 世界状态可行性报告：`../outputs/V2-世界状态机与长篇防降智幻觉可行性报告.md`
- WorldState-1 实现记录：`../outputs/WorldState-1-项目级结构化世界状态最小模型.md`
- V2-2.1 实现记录：`../outputs/V2-2.1-主角字段模型与UI.md`
- V2-2.2 实现记录：`../outputs/V2-2.2-压力源链字段模型与UI.md`
- V2-2.3 实现记录：`../outputs/V2-2.3-金手指字段模型与UI.md`
- V2-4.1 实现记录：`../outputs/V2-4.1-前30章字段模型.md`
- V2-5.1 规划记录：`../outputs/V2-5.1-前三章正文试写最小闭环规划.md`
- V2-5.2 草稿模型记录：`../outputs/V2-5.2-前三章正文草稿模型与保存链路.md`
- V2-5.3 编辑与本地检查记录：`../outputs/V2-5.3-前三章正文编辑与本地检查.md`
- V2-5.4 真实正文生成记录：`../outputs/V2-5.4-真实正文生成与上下文组装.md`
- V2-5.5 章节确认记录：`../outputs/V2-5.5-章节确认、世界状态回写与端到端验收.md`
- V2-5.6 局部补写记录：`../outputs/V2-5.6-正文缺口局部补写与人工采纳.md`
- V2-Trial-1 人工回归记录：`../outputs/V2-Trial-1-前三章连续试写与局部补写人工回归.md`

## 许可证

暂未指定。
