import type { PromptTemplate } from "./types";

export const promptTemplates: PromptTemplate[] = [
  {
    id: "taste.generate-samples",
    version: "v1.0.0",
    purpose: "生成 6 段原创网文开篇样本，用于味觉测试。",
    systemPrompt: "你是资深网文编辑，擅长捕捉不同网文类型的核心节奏和情绪钩子。",
    userPrompt: "请生成 6 段原创中文网文开篇，每段 180-260 字。分别覆盖以下风格：\n1. 快节奏爽文：强冲突、高压迫、快速反击\n2. 宏大世界观：慢热铺垫、史诗感、规则设定\n3. 情绪拉扯：人设反差、关系张力、情感博弈\n4. 信息差悬疑：读者知道更多、主角后知后觉\n5. 底层逆袭：底层压迫、资源争夺、成长渴望\n6. 轻松日常：温馨、幽默、低压开局",
    constraints: [
      "不得仿写任何具体作品或 IP",
      "每段必须有明确的情绪钩子",
      "避免使用过于常见的套路名词",
      "保持中文网文语感",
      "不替用户写正文，只给开篇"
    ],
    defaultOutputFormat: "JSON: [{ id, label, styleHint, text }]"
  },
  {
    id: "taste.analyze-preference",
    version: "v1.0.0",
    purpose: "根据用户对味觉样本的选择分析偏好画像。",
    systemPrompt: "你是懂网文口味的偏好分析引擎，擅长从用户选择中提取深层阅读偏好。",
    userPrompt: "根据用户对 6 段网文开篇的喜欢/不喜欢选择，分析其阅读偏好画像。",
    constraints: [
      "偏好判断必须基于用户的实际选择",
      "输出必须是结构化的偏好对象",
      "不做主观臆断",
      "风格倾向只在选项对应风格中选择"
    ],
    defaultOutputFormat: "JSON: { pacePreference, infoGapTolerance, emotionAmplitude, styleTendency }"
  },
  {
    id: "seed.ignite",
    version: "v1.0.0",
    purpose: "根据灵感种子生成 3 个世界观方案。",
    systemPrompt: "你是“灵光一闪 AI创意工坊”的创意推演引擎。目标：从用户的一句话灵感中生成三个反差明显、逻辑自洽、可继续扩写的大纲方向。",
    userPrompt: "基于用户灵感和偏好，生成三个方向的世界观方案：\n- preference：贴合用户偏好的稳妥方向\n- contrast：与偏好相反但逻辑自洽的反差方向\n- brainhole：脑洞更跳、更有反差的创新方向",
    constraints: [
      "不生成缝合怪",
      "不堆设定不推演，每个设定要有逻辑后果",
      "关键决策必须交给用户",
      "输出必须可读且有网文钩子",
      "不要替用户写正文",
      "每个方案要有独特的核心冲突"
    ],
    defaultOutputFormat: "JSON: { schemes: [{ id, type, title, tagline, coreConcept, powerSystem, conflictType, emotionCurve, similarSettingHints }] }"
  },
  {
    id: "theory.explain-check",
    version: "v1.0.0",
    purpose: "把规则检测结果解释成老书虫白话版建议。",
    systemPrompt: "你是懂网文节奏的创意编辑，擅长用老书虫视角给出实用建议。",
    userPrompt: "根据规则检测结果，为作者提供可操作的修改建议。",
    constraints: [
      "先给老书虫白话版解释，让作者一眼就懂",
      "理论解释作为展开内容，不喧宾夺主",
      "给出 3 个具体修改方向，不是泛泛而谈",
      "明确说明哪些建议可以忽略",
      "语气友好但专业，像资深编辑在盘书"
    ],
    defaultOutputFormat: "JSON: { theoryId, plainExplanation, theoryExplanation, suggestions, canIgnore }"
  },
  {
    id: "setting.extract-keywords",
    version: "v1.0.0",
    purpose: "从世界观文本中提取用于本地相似设定提示的关键词。",
    systemPrompt: "你是设定分析助手，擅长从网文设定中提取核心关键词。",
    userPrompt: "从用户提供的世界观设定文本中提取 5-10 个核心关键词。",
    constraints: [
      "优先选择力量体系、核心意象、组织势力、主角能力、世界规则",
      "关键词要有辨识度，避免通用词汇",
      "不要提取过于宽泛的词",
      "每个关键词对应设定中的具体元素"
    ],
    defaultOutputFormat: "JSON: { keywords: string[] }"
  }
];

export const getTemplateById = (id: PromptTemplate["id"]): PromptTemplate | undefined =>
  promptTemplates.find((template) => template.id === id);