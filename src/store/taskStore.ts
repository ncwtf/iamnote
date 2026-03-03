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
  togglePin: (id: string) => void;
  toggleFavorite: (id: string) => void;
  getGroupTasks: (groupId: string) => Task[];
  getFavoritedTasks: () => Task[];
  getAllTasksSorted: () => Task[];
  replaceAll: (tasks: Task[]) => Promise<void>;
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
    storageSet("tasks", updated);
  },

  updateTask: (id, patch) => {
    const updated = get().tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
    set({ tasks: updated });
    storageSet("tasks", updated);
  },

  deleteTask: (id) => {
    const updated = get().tasks.filter((t) => t.id !== id);
    set({ tasks: updated });
    storageSet("tasks", updated);
  },

  cycleStatus: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const currentIndex = STATUS_CYCLE.indexOf(task.status);
    const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length];

    if (nextStatus === "done") {
      if (task.recurringEnabled) {
        // 循环计数：完成次数 +1，重置回 todo
        const patch: Partial<Task> = {
          status: "todo",
          completedAt: new Date().toISOString(),
          recurringCount: task.recurringCount + 1,
        };
        // 周期循环：同时更新下次到期时间
        if (task.periodicEnabled) {
          patch.nextDueAt = calcNextDue(
            new Date(),
            task.periodicType,
            task.periodicInterval
          ).toISOString();
          patch.reminderAt = patch.nextDueAt;
          patch.reminderFired = false;
        }
        get().updateTask(id, patch);
        return;
      }
      // 普通任务完成
      get().updateTask(id, { status: "done", completedAt: new Date().toISOString() });
    } else {
      get().updateTask(id, { status: nextStatus });
    }
  },

  reverseCycleStatus: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const currentIndex = STATUS_CYCLE.indexOf(task.status);
    const prevStatus = STATUS_CYCLE[(currentIndex - 1 + STATUS_CYCLE.length) % STATUS_CYCLE.length];
    const patch: Partial<Task> = { status: prevStatus };
    if (prevStatus === "done") patch.completedAt = new Date().toISOString();
    get().updateTask(id, patch);
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
