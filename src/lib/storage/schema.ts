export const DB_NAME = "spark-workshop-v1";
export const DB_VERSION = 1;

export const stores = {
  preferences: "preferences",
  projects: "projects",
  snapshots: "snapshots"
} as const;

export type StoreName = (typeof stores)[keyof typeof stores];