import type { Project } from "@/types/product";
import { getArcPhaseFieldEntries, getArcPhaseRoleLabel } from "./arc-phase-fields";
import { getNodeEmotionGoal } from "./emotion-goals";
import { getGoldenFingerFieldEntries } from "./golden-finger-fields";
import { getOpeningChapterDraftCounts, isOpeningChapterDraftStale } from "./opening-chapter-drafts";
import { getOpeningChapterPlanCounts } from "./opening-chapter-plan";
import { getPressureSourceFieldEntries } from "./pressure-source-fields";
import { runQualityChecks } from "./quality-checker";
import { getProtagonistFieldEntries } from "./protagonist-fields";
import { getSerialArcFieldEntries } from "./serial-arc-fields";
import { formatTheoryEvidence } from "./theory-checker";
import { getWorldStateCounts, normalizeWorldState } from "./world-state";

const riskLabels: Record<Project["similarSettingHints"][number]["riskLevel"], string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险"
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
};

const normalizeContent = (value: string | undefined) => {
  const content = value?.trim();
  return content || "待补充";
};

const worldStateEntityKindLabels: Record<string, string> = {
  character: "人物",
  faction: "势力",
  location: "地点",
  item: "物品",
  ability: "能力",
  rule: "规则",
  other: "其他"
};

const worldStateRelationTypeLabels: Record<string, string> = {
  ally: "盟友",
  enemy: "敌对",
  belongsTo: "隶属",
  teacherStudent: "师徒",
  family: "亲属",
  rival: "竞争",
  debt: "债务",
  other: "其他"
};

const openingChapterDraftStatusLabels: Record<string, string> = {
  empty: "空草稿",
  draft: "草稿",
  confirmed: "已确认"
};

const openingChapterDraftOriginLabels: Record<string, string> = {
  author: "作者手写",
  llm: "AI 生成",
  hybrid: "作者 + AI 补写",
  "local-scaffold": "本地骨架"
};

const openingChapterDraftStateLabels: Record<string, string> = {
  pending: "待确认",
  confirmed: "已确认",
  retracted: "已撤回"
};

const sourceLabel = (source?: { label?: string; nodeId?: string; chapterRange?: string }) =>
  [source?.label, source?.chapterRange, source?.nodeId].filter(Boolean).join(" / ");

export const sanitizeMarkdownFilename = (value: string) => {
  const fallback = "未命名项目";
  const filename = (value.trim() || fallback)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 60)
    .trim();

  return filename || fallback;
};

export const buildProjectMarkdown = (project: Project) => {
  const nodes = [...project.outlineNodes].sort((a, b) => a.order - b.order);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const childNodesByParentId = new Map<string, typeof nodes>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const childNodes = childNodesByParentId.get(node.parentId) ?? [];
    childNodes.push(node);
    childNodesByParentId.set(node.parentId, childNodes);
  }
  const topLevelNodes = nodes.filter((node) => !node.parentId || !nodeIds.has(node.parentId));
  const lines: string[] = [
    `# ${project.title || "未命名项目"}`,
    "",
    "## 灵感种子",
    "",
    normalizeContent(project.seedText),
    "",
    "## 世界观方案",
    "",
    `- 方案标题：${project.selectedScheme.title || "未命名方案"}`,
    `- 方向类型：${project.selectedScheme.type}`,
    `- 钩子：${project.selectedScheme.tagline || "待补充"}`,
    `- 开篇钩子：${project.selectedScheme.storyHook || "待补充"}`,
    `- Premise：${project.selectedScheme.premise || "待补充"}`,
    `- 故事引擎：${project.selectedScheme.storyEngine || "待补充"}`,
    `- 情绪曲线：${project.selectedScheme.emotionCurve || "待补充"}`,
    "",
    "## 大纲节点",
    ""
  ];

  for (const node of topLevelNodes) {
    const emotionGoal = getNodeEmotionGoal(node);
    lines.push(`### ${node.title}`);
    if (node.metadata?.chapterRange) {
      lines.push("");
      lines.push(`章节范围：${node.metadata.chapterRange}`);
    }
    const serialArcEntries = node.kind === "act" ? getSerialArcFieldEntries(node.metadata) : [];
    if (serialArcEntries.length > 0) {
      lines.push("");
      lines.push("卷纲字段：");
      for (const entry of serialArcEntries) {
        lines.push(`- ${entry.label}：${entry.value}`);
      }
    }
    const protagonistEntries = node.kind === "protagonist" ? getProtagonistFieldEntries(node.metadata).filter((entry) => entry.value) : [];
    if (protagonistEntries.length > 0) {
      lines.push("");
      lines.push("主角字段：");
      for (const entry of protagonistEntries) {
        lines.push(`- ${entry.label}：${entry.value}`);
      }
    }
    const pressureSourceEntries = node.kind === "antagonist" ? getPressureSourceFieldEntries(node.metadata).filter((entry) => entry.value || entry.stageValue) : [];
    if (pressureSourceEntries.length > 0) {
      lines.push("");
      lines.push("压力源链字段：");
      for (const entry of pressureSourceEntries) {
        const stageText = entry.stageValue ? `（出场：${entry.stageValue}）` : "";
        lines.push(`- ${entry.label}${stageText}：${entry.value || "待补充"}`);
      }
    }
    const goldenFingerEntries = node.kind === "goldenFinger" ? getGoldenFingerFieldEntries(node.metadata).filter((entry) => entry.value) : [];
    if (goldenFingerEntries.length > 0) {
      lines.push("");
      lines.push("金手指字段：");
      for (const entry of goldenFingerEntries) {
        lines.push(`- ${entry.label}：${entry.value}`);
      }
    }
    lines.push("");
    lines.push(`读者情绪目标：${emotionGoal.emotion} / 强度 ${emotionGoal.intensity}`);
    lines.push(`读者承诺：${emotionGoal.promise}`);
    lines.push("");
    lines.push(normalizeContent(node.content));
    lines.push("");

    if (node.kind === "act") {
      const phaseNodes = childNodesByParentId.get(node.id) ?? [];
      for (const phaseNode of phaseNodes.sort((a, b) => a.order - b.order)) {
        const phaseEmotionGoal = getNodeEmotionGoal(phaseNode);
        const phaseRoleLabel = getArcPhaseRoleLabel(phaseNode.metadata?.phaseRole);
        const phaseEntries = getArcPhaseFieldEntries(phaseNode.metadata);

        lines.push(`#### ${phaseNode.title}`);
        if (phaseRoleLabel || phaseNode.metadata?.chapterRange) {
          lines.push("");
          if (phaseRoleLabel) {
            lines.push(`阶段功能：${phaseRoleLabel}`);
          }
          if (phaseNode.metadata?.chapterRange) {
            lines.push(`章节范围：${phaseNode.metadata.chapterRange}`);
          }
        }
        if (phaseEntries.length > 0) {
          lines.push("");
          lines.push("阶段字段：");
          for (const entry of phaseEntries) {
            lines.push(`- ${entry.label}：${entry.value}`);
          }
        }
        lines.push("");
        lines.push(`读者情绪目标：${phaseEmotionGoal.emotion} / 强度 ${phaseEmotionGoal.intensity}`);
        lines.push(`读者承诺：${phaseEmotionGoal.promise}`);
        lines.push("");
        lines.push(normalizeContent(phaseNode.content));
        lines.push("");
      }
    }
  }

  if (project.openingChapterPlan) {
    const counts = getOpeningChapterPlanCounts(project.openingChapterPlan);
    lines.push("## 前 30 章节奏表");
    lines.push("");
    lines.push(`- 章节范围：${project.openingChapterPlan.chapterRange}`);
    lines.push(`- 来源卷：${project.openingChapterPlan.sourceActId || "待确定"}`);
    lines.push(
      `- 结构统计：${counts.chapters} 章、${counts.chaptersWithHooks} 个章末钩子、${counts.chaptersWithStateChange} 个状态变化、${counts.chaptersWithRequiredFacts} 章绑定事实`
    );
    lines.push("");

    for (const chapter of [...project.openingChapterPlan.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber)) {
      lines.push(`### 第 ${chapter.chapterNumber} 章：${chapter.title.replace(/^第\d+章[：:]\s*/, "")}`);
      lines.push("");
      if (chapter.arcPhaseId) lines.push(`- 所属阶段：${chapter.arcPhaseId}`);
      lines.push(`- 读者问题：${normalizeContent(chapter.readerQuestion)}`);
      lines.push(`- 场景任务：${normalizeContent(chapter.sceneTask)}`);
      lines.push(`- 爽点/压迫：${normalizeContent(chapter.pressureOrPayoff)}`);
      lines.push(`- 章末钩子：${normalizeContent(chapter.chapterHook)}`);
      lines.push(`- 依赖事实：${chapter.requiredFactIds.length > 0 ? chapter.requiredFactIds.join("、") : "待补充"}`);
      lines.push(`- 状态变化：${normalizeContent(chapter.stateChange)}`);
      if (chapter.notes?.trim()) lines.push(`- 备注：${chapter.notes.trim()}`);
      lines.push("");
    }
  }

  if (project.openingChapterDrafts) {
    const counts = getOpeningChapterDraftCounts(project.openingChapterDrafts);
    lines.push("## 前三章正文草稿");
    lines.push("");
    lines.push(`- 章节范围：${project.openingChapterDrafts.chapterRange}`);
    lines.push(`- 结构统计：${counts.chapters} 章、${counts.empty} 个空草稿、${counts.draft} 个草稿、${counts.confirmed} 个已确认`);
    lines.push("");

    for (const draft of [...project.openingChapterDrafts.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber)) {
      const stale = isOpeningChapterDraftStale(draft, project.openingChapterPlan);
      lines.push(`### 第 ${draft.chapterNumber} 章正文：${draft.title.replace(/^第\d+章[：:]\s*/, "")}`);
      lines.push("");
      lines.push(`- 状态：${openingChapterDraftStatusLabels[draft.status] || draft.status}`);
      lines.push(`- 来源：${openingChapterDraftOriginLabels[draft.origin] || draft.origin}`);
      lines.push(`- 计划状态：${stale ? "正文基于旧计划" : "正文基于当前计划"}`);
      lines.push(`- 依赖事实：${draft.usedFactIds.length > 0 ? draft.usedFactIds.join("、") : "待补充"}`);
      lines.push(`- 状态变化确认：${openingChapterDraftStateLabels[draft.stateChangeStatus] || draft.stateChangeStatus}`);
      lines.push("");
      lines.push(normalizeContent(draft.content));
      lines.push("");
    }
  }

  if (project.worldState) {
    const worldState = normalizeWorldState(project.worldState);
    const counts = getWorldStateCounts(worldState);
    lines.push("## 世界状态基座");
    lines.push("");
    lines.push(`- 当前卷内阶段：${worldState.currentArcPhaseId || "待确定"}`);
    lines.push(
      `- 结构统计：${counts.entities} 条事实、${counts.relations} 条关系、${counts.openForeshadowings} 条开放伏笔、${counts.events} 条状态事件`
    );
    lines.push("");

    if (worldState.entities.length > 0) {
      lines.push("### 基础事实");
      lines.push("");
      for (const entity of worldState.entities) {
        lines.push(
          `- ${worldStateEntityKindLabels[entity.kind] || entity.kind} · ${entity.name} · ${entity.status}`
        );
        lines.push(`  - 当前状态：${normalizeContent(entity.currentState)}`);
        lines.push(`  - 摘要：${normalizeContent(entity.summary)}`);
        const source = sourceLabel(entity.source);
        if (source) lines.push(`  - 来源：${source}`);
      }
      lines.push("");
    }

    if (worldState.relations.length > 0) {
      lines.push("### 关系与势力");
      lines.push("");
      for (const relation of worldState.relations) {
        const relationLabel = relation.relationLabel || worldStateRelationTypeLabels[relation.relationType] || relation.relationType;
        lines.push(`- ${relation.fromEntityId} -> ${relation.toEntityId} · ${relationLabel} · ${relation.status}`);
        lines.push(`  - 摘要：${normalizeContent(relation.summary)}`);
        const source = sourceLabel(relation.source);
        if (source) lines.push(`  - 来源：${source}`);
      }
      lines.push("");
    }

    if (worldState.foreshadowings.length > 0) {
      lines.push("### 伏笔与后果");
      lines.push("");
      for (const foreshadowing of worldState.foreshadowings) {
        lines.push(`- ${foreshadowing.title} · ${foreshadowing.status}`);
        lines.push(`  - 摘要：${normalizeContent(foreshadowing.summary)}`);
        if (foreshadowing.triggerCondition) lines.push(`  - 触发条件：${foreshadowing.triggerCondition}`);
        if (foreshadowing.plannedPayoff) lines.push(`  - 计划兑现：${foreshadowing.plannedPayoff}`);
        const source = sourceLabel(foreshadowing.source);
        if (source) lines.push(`  - 来源：${source}`);
      }
      lines.push("");
    }

    if (worldState.events.length > 0) {
      lines.push("### 状态变化记录");
      lines.push("");
      for (const event of worldState.events) {
        lines.push(`- ${event.kind} · ${event.status} · ${event.createdAt}`);
        lines.push(`  - ${normalizeContent(event.summary)}`);
        const source = sourceLabel(event.source);
        if (source) lines.push(`  - 来源：${source}`);
      }
      lines.push("");
    }
  }

  if (project.similarSettingHints.length > 0) {
    lines.push("## 相似设定提示");
    lines.push("");
    for (const hint of project.similarSettingHints) {
      lines.push(`- ${riskLabels[hint.riskLevel]} · ${hint.keyword}`);
      lines.push(`  - 可能撞味：${hint.possibleTitles.join("、")}`);
      lines.push(`  - 建议：${hint.suggestion}`);
    }
    lines.push("");
  }

  if (project.theoryChecks.length > 0) {
    lines.push("## 理论检测结果");
    lines.push("");
    for (const check of project.theoryChecks) {
      lines.push(`- ${check.theoryId} · ${check.location} · ${check.severity}`);
      lines.push(`  - ${check.message}`);
      if (check.rescueOptions.length > 0) {
        lines.push(`  - 修改方向：${check.rescueOptions.join("；")}`);
      }
      if (check.evidence && check.evidence.length > 0) {
        lines.push(`  - 证据：${check.evidence.slice(0, 3).map(formatTheoryEvidence).join("；")}`);
      }
    }
    lines.push("");
  }

  const qualityChecks = runQualityChecks({ outlineNodes: nodes });
  if (qualityChecks.length > 0) {
    lines.push("## 网文质检清单");
    lines.push("");
    for (const check of qualityChecks) {
      lines.push(`- ${check.title} · ${check.location} · ${check.severity}`);
      lines.push(`  - ${check.message}`);
      if (check.suggestions.length > 0) {
        lines.push(`  - 修改方向：${check.suggestions.join("；")}`);
      }
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(`导出时间：${formatDate(new Date().toISOString())}`);
  lines.push(`项目更新时间：${formatDate(project.updatedAt)}`);

  return `${lines.join("\n").trim()}\n`;
};
