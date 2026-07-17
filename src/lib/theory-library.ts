import type { TheoryCategory, TheoryDefinition, TheoryId, V1TheoryId } from "@/types/product";

export const theoryCategoryLabels: Record<TheoryCategory, string> = {
  structure: "结构力学",
  rhythm: "节奏动力学",
  economy: "体系经济学",
  psychology: "角色心理学",
  conflict: "冲突设计学",
  innovation: "设定创新学"
};

export const theoryCategoryDescriptions: Record<TheoryCategory, string> = {
  structure: "故事骨架",
  rhythm: "爽点分布与期待感",
  economy: "力量、财富、能力不膨胀",
  psychology: "人物驱动与共情",
  conflict: "矛盾升级与对抗张力",
  innovation: "世界观新鲜感与自洽"
};

export const theories: TheoryDefinition[] = [
  {
    id: "T01",
    category: "structure",
    academicName: "三幕剧/英雄之旅",
    plainName: "故事别半路跑偏",
    coreIdea: "故事是“出发-磨难-回归”的循环",
    aiRule: "黄金开局检测、第一幕关门提醒"
  },
  {
    id: "T02",
    category: "structure",
    academicName: "施耐德救猫咪",
    plainName: "开场让读者心疼主角",
    coreIdea: "主角出场必须做一件让读者共情的事",
    aiRule: "开场共情元素检测"
  },
  {
    id: "T03",
    category: "structure",
    academicName: "麦基鸿沟",
    plainName: "期望落空才有故事",
    coreIdea: "期望与现实的差距是故事发动机",
    aiRule: "鸿沟监测器，连续无落差则警告"
  },
  {
    id: "T04",
    category: "structure",
    academicName: "契诃夫之枪",
    plainName: "前面挂了枪后面就得响",
    coreIdea: "任何伏笔都必须回收",
    aiRule: "枪械追踪系统，未回收伏笔标红"
  },
  {
    id: "T05",
    category: "structure",
    academicName: "特修斯之船",
    plainName: "全换了还是原来那个人吗",
    coreIdea: "全部替换后还是原来的人吗？",
    aiRule: "身份连续性检测，防止人设崩坏"
  },
  {
    id: "T06",
    category: "rhythm",
    academicName: "荷马式延宕",
    plainName: "爽点别急着给，先吊着",
    coreIdea: "伟大的行动被刻意推迟以积蓄势能",
    aiRule: "追读心电图预警系统"
  },
  {
    id: "T07",
    category: "rhythm",
    academicName: "爽点三循环",
    plainName: "憋屈→准备→爆发→收获→新危机",
    coreIdea: "憋屈→准备→爆发→收获→新危机",
    aiRule: "循环脉冲生成器"
  },
  {
    id: "T08",
    category: "rhythm",
    academicName: "过山车效应",
    plainName: "爬得越高摔得越爽，但别连着摔",
    coreIdea: "缓慢爬升后的骤然坠落最刺激",
    aiRule: "高潮后综合征预防器"
  },
  {
    id: "T09",
    category: "rhythm",
    academicName: "信息差悬疑",
    plainName: "让读者知道主角不知道的事",
    coreIdea: "悬疑来自读者与主角的信息不对等",
    aiRule: "信息差构造器"
  },
  {
    id: "T10",
    category: "rhythm",
    academicName: "假高潮与真高潮交替",
    plainName: "每次都是大高潮人会麻",
    coreIdea: "持续高强度会麻木",
    aiRule: "阈值管理检测"
  },
  {
    id: "T11",
    category: "economy",
    academicName: "麦克斯韦妖/熵增",
    plainName: "外挂开太大要付代价",
    coreIdea: "打破规则的金手指必须付出代价",
    aiRule: "金手指反噬触发器"
  },
  {
    id: "T12",
    category: "economy",
    academicName: "边际效用递减",
    plainName: "别让主角连着装三次同样的逼",
    coreIdea: "持续获得同一样东西，满足感下降",
    aiRule: "力量天花板监测"
  },
  {
    id: "T13",
    category: "economy",
    academicName: "生态位法则",
    plainName: "每个势力都得有存在的理由",
    coreIdea: "每个势力都有其不可替代的位置",
    aiRule: "生态位冲突警报"
  },
  {
    id: "T14",
    category: "economy",
    academicName: "机会成本",
    plainName: "选了A就不能选B，代价得写出来",
    coreIdea: "选择的代价是放弃另一种可能",
    aiRule: "代价标注检测"
  },
  {
    id: "T15",
    category: "economy",
    academicName: "资源诅咒",
    plainName: "天上掉的馅饼可能通向绝路",
    coreIdea: "天降资源可能通向绝路",
    aiRule: "诅咒反转生成器"
  },
  {
    id: "T16",
    category: "economy",
    academicName: "马太效应",
    plainName: "主角变强，反派也得同步变强",
    coreIdea: "强者愈强，反派也需同步成长",
    aiRule: "反派同步成长监测"
  },
  {
    id: "T17",
    category: "psychology",
    academicName: "坎贝尔原型理论",
    plainName: "你的主角属于哪一类经典角色",
    coreIdea: "角色背后是永恒的原型模式",
    aiRule: "原型铸像工坊"
  },
  {
    id: "T18",
    category: "psychology",
    academicName: "马斯洛需求层次",
    plainName: "主角需求要从生存到自我实现一步步来",
    coreIdea: "需求从生理到自我实现逐级跃迁",
    aiRule: "契约闭环验证器"
  },
  {
    id: "T19",
    category: "psychology",
    academicName: "俄狄浦斯悖论",
    plainName: "越躲什么越来什么",
    coreIdea: "逃避预言反而促成预言",
    aiRule: "悖论宿命生成器"
  },
  {
    id: "T20",
    category: "psychology",
    academicName: "荣格阴影理论",
    plainName: "再光明的主角也得有阴暗面",
    coreIdea: "每个人都有一个被压抑的阴暗面",
    aiRule: "阴影显现触发器"
  },
  {
    id: "T21",
    category: "psychology",
    academicName: "斯德哥尔摩综合症",
    plainName: "被害者爱上加害者怎么圆",
    coreIdea: "被害者对加害者产生情感依赖",
    aiRule: "扭曲羁绊生成器"
  },
  {
    id: "T22",
    category: "psychology",
    academicName: "替罪羊机制",
    plainName: "群众需要一个出气筒",
    coreIdea: "群体通过献祭个体释放压力",
    aiRule: "社会压力阀推演器"
  },
  {
    id: "T23",
    category: "conflict",
    academicName: "囚徒困境",
    plainName: "信任是奢侈品，不信任才是常态",
    coreIdea: "信任是稀缺资源，博弈驱动剧情",
    aiRule: "信任博弈沙盘"
  },
  {
    id: "T24",
    category: "conflict",
    academicName: "电车难题",
    plainName: "怎么选都有人死，这就是张力",
    coreIdea: "两难选择，任何选项都有代价",
    aiRule: "道德重力选择器"
  },
  {
    id: "T25",
    category: "conflict",
    academicName: "公地悲剧",
    plainName: "大家一起薅羊毛，最后都没得薅",
    coreIdea: "理性个体行为导致公共资源枯竭",
    aiRule: "资源枯竭推演器"
  },
  {
    id: "T26",
    category: "conflict",
    academicName: "第22条军规",
    plainName: "这是一个怎么选都是坑的死局",
    coreIdea: "逻辑死锁式的规则悖论",
    aiRule: "逻辑死锁检测"
  },
  {
    id: "T27",
    category: "innovation",
    academicName: "缸中之脑",
    plainName: "你以为的现实可能是假的",
    coreIdea: "现实可能是模拟的",
    aiRule: "现实边界颠覆器"
  },
  {
    id: "T28",
    category: "innovation",
    academicName: "拉普拉斯妖",
    plainName: "有一个什么都知道的对手",
    coreIdea: "能预知一切的存在",
    aiRule: "全知反派生成器"
  },
  {
    id: "T29",
    category: "innovation",
    academicName: "蝴蝶效应",
    plainName: "一个小改动，后面全乱套",
    coreIdea: "微小变化引发巨大连锁反应",
    aiRule: "涟漪推演沙盘"
  },
  {
    id: "T30",
    category: "innovation",
    academicName: "无限猴子定理",
    plainName: "只要试得够多，什么都能成",
    coreIdea: "无限试错终能创造奇迹",
    aiRule: "穷举美学生成器"
  }
];

export const getTheoriesByCategory = (category: TheoryCategory) =>
  theories.filter((theory) => theory.category === category);

const V1_THEORY_IDS: V1TheoryId[] = [
  "T01",
  "T02",
  "T03",
  "T04",
  "T07",
  "T11",
  "T12",
  "T13"
];

export const v1Theories: TheoryDefinition[] = theories.filter((theory) =>
  V1_THEORY_IDS.includes(theory.id as V1TheoryId)
);

export const isV1Theory = (id: TheoryId): id is V1TheoryId =>
  V1_THEORY_IDS.includes(id as V1TheoryId);

export const getTheoryById = (id: TheoryId): TheoryDefinition | undefined =>
  theories.find((theory) => theory.id === id);
