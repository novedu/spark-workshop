import type { Project, ProjectSnapshot, UserPreference } from "@/types/product";
import { ensureOpeningChapterDrafts } from "./opening-chapter-drafts";
import { ensureOpeningChapterPlan } from "./opening-chapter-plan";
import { ensureWorldState } from "./world-state";
import { DB_NAME, DB_VERSION, stores } from "./storage/schema";

type StoreValueMap = {
  preferences: UserPreference & { id: "current" };
  projects: Project;
  snapshots: ProjectSnapshot;
};

const normalizeProject = (project: Project): Project => {
  const openingChapterPlan = ensureOpeningChapterPlan(project);
  const openingChapterDrafts = ensureOpeningChapterDrafts({
    ...project,
    openingChapterPlan
  });

  return {
    ...project,
    openingChapterPlan,
    openingChapterDrafts,
    worldState: ensureWorldState({
      ...project,
      openingChapterPlan
    })
  };
};

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      for (const store of Object.values(stores)) {
        if (!database.objectStoreNames.contains(store)) {
          database.createObjectStore(store, { keyPath: "id" });
        }
      }
    };

    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
    request.onsuccess = () => resolve(request.result);
  });

const withStore = async <T>(
  storeName: keyof typeof stores,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T> | void
) => {
  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    transaction.oncomplete = () => {
      database.close();
    };

    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error(`IndexedDB transaction failed for ${storeName}.`));
    };

    if (!request) {
      transaction.oncomplete = () => {
        database.close();
        resolve(undefined as T);
      };
      return;
    }

    request.onerror = () => reject(request.error ?? new Error(`IndexedDB request failed for ${storeName}.`));
    request.onsuccess = () => resolve(request.result);
  });
};

export const localStore = {
  getPreference: async () => withStore<StoreValueMap["preferences"] | undefined>(
    "preferences",
    "readonly",
    (store) => store.get("current")
  ),

  savePreference: async (preference: UserPreference) =>
    withStore<void>("preferences", "readwrite", (store) => {
      store.put({ ...preference, id: "current" });
    }),

  deletePreference: async () =>
    withStore<void>("preferences", "readwrite", (store) => {
      store.delete("current");
    }),

  clearPreferences: async () =>
    withStore<void>("preferences", "readwrite", (store) => {
      store.clear();
    }),

  listProjects: async () =>
    withStore<Project[]>("projects", "readonly", (store) => store.getAll()).then((projects) =>
      projects.map(normalizeProject).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    ),

  getProject: async (id: string) =>
    withStore<Project | undefined>("projects", "readonly", (store) => store.get(id)).then((project) =>
      project ? normalizeProject(project) : undefined
    ),

  saveProject: async (project: Project) =>
    withStore<void>("projects", "readwrite", (store) => {
      store.put(normalizeProject(project));
    }),

  deleteProject: async (id: string) =>
    withStore<void>("projects", "readwrite", (store) => {
      store.delete(id);
    }),

  clearProjects: async () =>
    withStore<void>("projects", "readwrite", (store) => {
      store.clear();
    }),

  saveSnapshot: async (snapshot: ProjectSnapshot) =>
    withStore<void>("snapshots", "readwrite", (store) => {
      store.put({
        ...snapshot,
        data: normalizeProject(snapshot.data)
      });
    }),

  listSnapshots: async (projectId: string) =>
    withStore<ProjectSnapshot[]>("snapshots", "readonly", (store) => store.getAll()).then((snapshots) =>
      snapshots
        .filter((snapshot) => snapshot.projectId === projectId)
        .map((snapshot) => ({
          ...snapshot,
          data: normalizeProject(snapshot.data)
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    ),

  deleteSnapshot: async (id: string) =>
    withStore<void>("snapshots", "readwrite", (store) => {
      store.delete(id);
    }),

  clearSnapshots: async () =>
    withStore<void>("snapshots", "readwrite", (store) => {
      store.clear();
    }),

  resetAll: async () => {
    await Promise.all([
      localStore.clearPreferences(),
      localStore.clearProjects(),
      localStore.clearSnapshots()
    ]);
  }
};
