import type { Project } from "@/types/product";
import { getNodeEmotionGoal } from "./emotion-goals";
import { runQualityChecks } from "./quality-checker";

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

  for (const node of nodes) {
    const emotionGoal = getNodeEmotionGoal(node);
    lines.push(`### ${node.title}`);
    if (node.metadata?.chapterRange) {
      lines.push("");
      lines.push(`章节范围：${node.metadata.chapterRange}`);
    }
    lines.push("");
    lines.push(`读者情绪目标：${emotionGoal.emotion} / 强度 ${emotionGoal.intensity}`);
    lines.push(`读者承诺：${emotionGoal.promise}`);
    lines.push("");
    lines.push(normalizeContent(node.content));
    lines.push("");
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
