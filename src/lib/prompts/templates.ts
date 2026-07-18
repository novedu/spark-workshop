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
    defaultOutputFormat: "JSON: { samples: [{ id, label, styleHint, text }] }"
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
      "风格倾向只在选项对应风格中选择",
      "pacePreference 只能取 fast、medium、slow",
      "infoGapTolerance 和 emotionAmplitude 只能取 high、medium、low",
      "styleTendency 只能取 feilu、qidian、fanqie、jinjiang、balanced"
    ],
    defaultOutputFormat: "JSON: { pacePreference, infoGapTolerance, emotionAmplitude, styleTendency }"
  },
  {
    id: "seed.ignite",
    version: "v1.2.0",
    purpose: "根据碎片灵感或一句话灵感生成 3 个世界观方案。",
    systemPrompt: "你是“灵光一闪 AI创意工坊”的创意推演引擎。目标：从用户给出的一个词、一个意象、一句话或较完整设定中，先补足可创作的假设，再生成三个反差明显、逻辑自洽、可继续扩写的大纲方向。",
    userPrompt: "基于用户灵感和偏好，生成三个方向的世界观方案。用户输入可能只是一个很小的点子，例如“记忆”“长廊”“无限 token”“脑内 AI”。你需要先围绕这个点子补出主角、世界规则、能力代价和持续冲突，再输出：\n- preference：贴合用户偏好的稳妥方向\n- contrast：与偏好相反但逻辑自洽的反差方向\n- brainhole：脑洞更跳、更有反差的创新方向",
    constraints: [
      "允许用户输入极短碎片，不要求用户先补全设定",
      "如果输入只有一个词或意象，必须把它扩写成可连载的故事假设",
      "每个方案都必须保留用户原始点子的核心意象，不能换题",
      "补充内容只能作为候选推演，不替用户定稿",
      "不生成缝合怪",
      "不堆设定不推演，每个设定要有逻辑后果",
      "关键决策必须交给用户",
      "输出必须可读且有网文钩子",
      "不要替用户写正文",
      "如果用户提到参考作品，只抽象借鉴类型和爽点，不复用具体人物、世界观、情节或专有设定",
      "每个方案要有独特的核心冲突",
      "storyHook 写开篇钩子：读者第一眼为什么继续看",
      "premise 写一句故事前提：谁想要什么、被什么阻碍、失败会怎样",
      "storyEngine 写故事发动机：什么矛盾能持续制造章节"
    ],
    defaultOutputFormat: "JSON: { schemes: [{ id, type, title, tagline, storyHook, premise, storyEngine, coreConcept, powerSystem, conflictType, emotionCurve, similarSettingHints }] }"
  },
  {
    id: "outline.enhance-node",
    version: "v1.0.0",
    purpose: "根据当前大纲节点缺口，补写可直接编辑的节点内容。",
    systemPrompt: "你是懂网文开篇、人物驱动和设定经济学的资深创作编辑。你只补大纲节点，不写正文，不替作者定稿。",
    userPrompt: "请根据当前节点、完整大纲上下文和节点类型，补写一段可直接放入该节点的中文大纲内容。重点补齐缺失要素，保留用户已有设定的方向。",
    constraints: [
      "只补当前节点，不改其他节点",
      "不要覆盖用户已有内容，而是补充缺失信息",
      "输出必须具体，可编辑，可直接粘进大纲",
      "不要仿写具体作品或 IP",
      "不要写正文场景，只写大纲设定",
      "补写内容必须服务当前节点的读者情绪目标",
      "主角节点重点补：姓名、底层欲望、开场困境、成长弧线",
      "反派/压力源节点重点补：阶段性压力来源、目标、资源、压迫方式、与主角欲望的冲突；不要求开局就确定终极反派",
      "金手指节点重点补：来源、代价、限制、升级边界",
      "核心冲突节点重点补：主角目标、现实阻碍、失败代价、升级方式",
      "篇章/卷纲节点重点补：本卷目标、阶段压力源、升级资源、小高潮、结尾钩子",
      "伏笔节点重点补：埋下什么、何时回收、如何引爆"
    ],
    defaultOutputFormat: "JSON: { content: string, suggestions: string[] }"
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
