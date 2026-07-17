import { createOutlineFromScheme } from "@/lib/outline-template";
import type { Project, ProjectSnapshot, UserPreference, WorldScheme } from "@/types/product";
import { localStore } from "../storage";

export type StorageSmokeResult = {
  ok: boolean;
  steps: string[];
};

const smokePreference: UserPreference = {
  pacePreference: "medium",
  infoGapTolerance: "medium",
  emotionAmplitude: "medium",
  styleTendency: "balanced"
};

const smokeScheme: WorldScheme = {
  id: "__smoke_scheme__",
  type: "preference",
  title: "烟测小世界",
  tagline: "只用于验证本地存储，不进入正式项目。",
  coreConcept: "一个用于 IndexedDB smoke test 的临时世界观。",
  powerSystem: "每次保存都要能被读取，每次清理都要不留脏数据。",
  conflictType: "本地数据一致性与临时验证数据之间的冲突",
  emotionCurve: "轻量验证"
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export const runStorageSmokeTest = async (): Promise<StorageSmokeResult> => {
  const steps: string[] = [];
  const previousPreference = await localStore.getPreference();
  const now = new Date().toISOString();
  const projectId = `__smoke_project_${Date.now()}__`;
  const snapshotId = `__smoke_snapshot_${Date.now()}__`;

  const project: Project = {
    id: projectId,
    title: smokeScheme.title,
    seedText: "storage smoke test",
    selectedScheme: smokeScheme,
    outlineNodes: createOutlineFromScheme(smokeScheme),
    theoryChecks: [],
    similarSettingHints: [],
    createdAt: now,
    updatedAt: now
  };

  const snapshot: ProjectSnapshot = {
    id: snapshotId,
    projectId,
    createdAt: now,
    reason: "manualSave",
    data: project
  };

  try {
    await localStore.savePreference(smokePreference);
    const savedPreference = await localStore.getPreference();
    assert(savedPreference?.styleTendency === "balanced", "Preference read/write failed.");
    steps.push("preferences write/read ok");

    await localStore.saveProject(project);
    const savedProject = await localStore.getProject(projectId);
    assert(savedProject, "Project read/write failed.");
    assert(savedProject.id === projectId, "Project read/write returned the wrong project.");
    assert(savedProject.outlineNodes.length >= 8, "Project outline template is incomplete.");
    steps.push("projects write/read ok");

    await localStore.saveSnapshot(snapshot);
    const snapshots = await localStore.listSnapshots(projectId);
    assert(snapshots.some((item) => item.id === snapshotId), "Snapshot read/write failed.");
    steps.push("snapshots write/read ok");

    await localStore.deleteSnapshot(snapshotId);
    await localStore.deleteProject(projectId);
    steps.push("temporary project/snapshot cleanup ok");

    return { ok: true, steps };
  } finally {
    if (previousPreference) {
      await localStore.savePreference(previousPreference);
      steps.push("previous preference restored");
    } else {
      await localStore.deletePreference();
      steps.push("temporary preference cleanup ok");
    }
  }
};
