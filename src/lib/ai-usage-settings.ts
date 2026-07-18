export type AiUsageSettings = {
  saveTokenMode: boolean;
  confirmHighCostActions: boolean;
};

const storageKey = "spark-workshop:ai-usage-settings:v1";

export const defaultAiUsageSettings: AiUsageSettings = {
  saveTokenMode: false,
  confirmHighCostActions: false
};

export const getAiUsageSettings = (): AiUsageSettings => {
  if (typeof window === "undefined") return defaultAiUsageSettings;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaultAiUsageSettings;
    return {
      ...defaultAiUsageSettings,
      ...(JSON.parse(raw) as Partial<AiUsageSettings>)
    };
  } catch {
    return defaultAiUsageSettings;
  }
};

export const saveAiUsageSettings = (settings: AiUsageSettings) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch {
    // Best-effort preference.
  }
};

export const shouldConfirmAiOperation = () => getAiUsageSettings().confirmHighCostActions;
