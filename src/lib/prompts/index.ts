import type {
  BuiltPrompt,
  PromptContext,
  PromptGenerationOptions,
  PromptTemplate,
  PromptTemplateType
} from "./types";
import { getTemplateById } from "./templates";

export function buildPrompt(
  templateId: PromptTemplateType,
  context: PromptContext = {},
  options: PromptGenerationOptions = {}
): BuiltPrompt {
  const template = getTemplateById(templateId);

  if (!template) {
    throw new Error(`Prompt template not found: ${templateId}`);
  }

  const { optimizationMode = "template-only" } = options;

  let systemContent = template.systemPrompt;
  let userContent = template.userPrompt;

  const injectedContext: string[] = [];

  if (context.userInput) {
    injectedContext.push(`用户输入：${context.userInput}`);
  }

  if (context.userPreference) {
    injectedContext.push(`用户偏好：${JSON.stringify(context.userPreference)}`);
  }

  if (context.additionalContext) {
    Object.entries(context.additionalContext).forEach(([key, value]) => {
      injectedContext.push(`${key}：${JSON.stringify(value)}`);
    });
  }

  if (injectedContext.length > 0) {
    userContent += "\n\n---\n\n上下文信息：\n" + injectedContext.join("\n");
  }

  const constraintsSection = template.constraints
    .map((c, i) => `${i + 1}. ${c}`)
    .join("\n");

  userContent += "\n\n---\n\n约束条件：\n" + constraintsSection;

  userContent += "\n\n---\n\n输出格式：\n" + template.defaultOutputFormat;

  if (context.systemConstraints && context.systemConstraints.length > 0) {
    systemContent += "\n\n附加约束：\n" + context.systemConstraints.join("\n");
  }

  if (optimizationMode === "ai-enhanced") {
    systemContent += "\n\n提示优化：请根据上下文自动优化你的回答策略，但不要违背上述约束。";
  }

  if (optimizationMode === "ai-generated") {
    systemContent += "\n\n提示优化：你可以完全重新组织回答结构，但必须满足上述所有约束条件和输出格式要求。";
  }

  return {
    templateId,
    templateVersion: template.version,
    optimizationMode,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: userContent }
    ]
  };
}

export type {
  BuiltPrompt,
  PromptContext,
  PromptGenerationOptions,
  PromptTemplate,
  PromptTemplateType
};

export { promptTemplates, getTemplateById } from "./templates";