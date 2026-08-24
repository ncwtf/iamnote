import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { Task, STATUS_CYCLE, TASK_META_DEFAULTS, calcNextDue } from "../types";
import { storageGet, storageSet } from "../lib/storage";

interface TaskState {
  tasks: Task[];
  loaded: boolean;
  load: () => Promise<void>;
  addTask: (groupId: string, title: string) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  cycleStatus: (id: string) => void;
  reverseCycleStatus: (id: string) => void;
  setTaskStatus: (id: string, status: Task["status"]) => void;
  completeTask: (id: string) => void;
  cancelTask: (id: string) => void;
  togglePin: (id: string) => void;
  toggleFavorite: (id: string) => void;
  reorderTasks: (orderedIds: string[]) => void;
  getGroupTasks: (groupId: string) => Task[];
  getFavoritedTasks: () => Task[];
  getAllTasksSorted: () => Task[];
  replaceAll: (tasks: Task[]) => Promise<void>;
}

function persist(tasks: Task[]) {
  storageSet("tasks", tasks);
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loaded: false,

  load: async () => {
    const saved = await storageGet<Task[]>("tasks");
    const tasks = (saved ?? []).map((t) => ({
      ...TASK_META_DEFAULTS,
      ...t,
      favorited: t.favorited ?? false,
      completedAt: t.completedAt ?? null,
      detail: t.detail ?? "",
    }));
    set({ tasks, loaded: true });
  },

  addTask: (groupId, title) => {
    const { tasks } = get();
    const groupTasks = tasks.filter((t) => t.groupId === groupId);
    const newTask: Task = {
      id: uuidv4(),
      groupId,
      title,
      detail: "",
      status: "todo",
      pinned: false,
      favorited: false,
      order: groupTasks.length,
      createdAt: new Date().toISOString(),
      completedAt: null,
      ...TASK_META_DEFAULTS,
    };
    const updated = [...tasks, newTask];
    set({ tasks: updated });
    persist(updated);
  },

  updateTask: (id, patch) => {
    const updated = get().tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
    set({ tasks: updated });
    persist(updated);
  },

  deleteTask: (id) => {
    const updated = get().tasks.filter((t) => t.id !== id);
    set({ tasks: updated });
    persist(updated);
  },

  completeTask: (id) => {
    const { tasks } = get();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const now = new Date().toISOString();

    if (task.recurringEnabled) {
      const nextCount = task.recurringCount + 1;
      const snapshot: Task = {
        ...task,
        ...TASK_META_DEFAULTS,
        id: uuidv4(),
        title: task.title,
        detail: task.detail,
        groupId: task.groupId,
        status: "done",
        pinned: false,
        favorited: false,
        order: tasks.length,
        createdAt: task.createdAt,
        completedAt: now,
        recurringEnabled: false,
        recurringCount: nextCount,
      };
      const patch: Partial<Task> = {
        status: "todo",
        completedAt: now,
        recurringCount: nextCount,
      };
      if (task.periodicEnabled) {
        patch.nextDueAt = calcNextDue(
          new Date(),
          task.periodicType,
          task.periodicInterval
        ).toISOString();
        patch.reminderAt = patch.nextDueAt;
        patch.reminderFired = false;
      }
      const updated = [
        ...tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        snapshot,
      ];
      set({ tasks: updated });
      persist(updated);
      return;
    }

    if (task.status === "done") return;
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, status: "done" as const, completedAt: now } : t
    );
    set({ tasks: updated });
    persist(updated);
  },

  cancelTask: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task || task.status === "cancelled") return;
    get().updateTask(id, { status: "cancelled", completedAt: new Date().toISOString() });
  },

  setTaskStatus: (id, status) => {
    if (status === "done") {
      get().completeTask(id);
      return;
    }
    if (status === "cancelled") {
      get().cancelTask(id);
      return;
    }
    get().updateTask(id, { status });
  },

  cycleStatus: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    if (task.status === "cancelled") {
      get().updateTask(id, { status: "todo" });
      return;
    }
    const currentIndex = STATUS_CYCLE.indexOf(task.status);
    const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length];
    get().setTaskStatus(id, nextStatus);
  },

  reverseCycleStatus: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const currentIndex = STATUS_CYCLE.indexOf(task.status);
    const prevStatus = STATUS_CYCLE[(currentIndex - 1 + STATUS_CYCLE.length) % STATUS_CYCLE.length];
    get().setTaskStatus(id, prevStatus);
  },

  togglePin: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    get().updateTask(id, { pinned: !task.pinned });
  },

  toggleFavorite: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    get().updateTask(id, { favorited: !task.favorited });
  },

  reorderTasks: (orderedIds) => {
    const rank = new Map(orderedIds.map((id, i) => [id, i]));
    const updated = get().tasks.map((t) =>
      rank.has(t.id) ? { ...t, order: rank.get(t.id)! } : t
    );
    set({ tasks: updated });
    persist(updated);
  },

  getGroupTasks: (groupId) => {
    return get().tasks
      .filter((t) => t.groupId === groupId)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return a.order - b.order;
      });
  },

  getFavoritedTasks: () => {
    return get().tasks
      .filter((t) => t.favorited)
      .sort((a, b) => {
        if (a.groupId !== b.groupId) return a.groupId.localeCompare(b.groupId);
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return a.order - b.order;
      });
  },

  getAllTasksSorted: () => {
    return get().tasks.slice().sort((a, b) => {
      if (a.groupId !== b.groupId) return a.groupId.localeCompare(b.groupId);
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.order - b.order;
    });
  },

  replaceAll: async (tasks) => {
    set({ tasks });
    await storageSet("tasks", tasks);
  },
}));
