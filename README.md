# 灵光一闪 AI创意工坊

AI 驱动的网文写作辅助工具：从一句话灵感出发，生成三个世界观方向，进入可编辑大纲，并通过理论引擎检测帮你发现故事可能崩盘的地方。

## 当前状态

- 当前已达到“内部试用版”门槛：灵感引爆、方案选择、长篇卷纲、大纲编辑、理论诊断、AI 补全、保存、快照和 Markdown 导出已经形成闭环。
- 当前 V2 主线目标是“可公开小范围试用版”：从小点子推进到可开书的前 30 章准备包。
- 真实 LLM 通过服务端代理接入，支持 OpenAI 兼容网关；Claude / Ollama 目前只保留适配器类型，尚未完成真实实现。
- V1 仍是本地优先的单用户工具，数据默认保存在浏览器 IndexedDB。
- 当前不承诺完整千章管理、云同步、完整 30 理论引擎、完整 IP 相似度检测或完整版本历史。

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

### Markdown 导出
一键导出完整大纲为 Markdown 文件，便于在其他编辑器中继续创作。

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
│   ├── run-v1-acceptance-smoke.mjs
│   └── run-v2-serial-arc-smoke.mjs
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
- `explainTheoryCheck`: 解释理论检测结果

当前真实链路优先支持 OpenAI-compatible Chat Completions。其他 provider 类型用于后续扩展，不代表已经可用。

## 数据存储

所有数据存储在浏览器本地 IndexedDB，无需云端同步：
- **preferences**: 用户阅读偏好
- **projects**: 项目列表与大纲数据
- **snapshots**: 项目版本快照

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
- V1 理论样例：`npm run theory:eval`
- V1 收口记录：`../outputs/V1-Acceptance-3-内部试用回归记录.md`
- V2 规划：`../outputs/V2-产品规划.md`

## 许可证

暂未指定。
