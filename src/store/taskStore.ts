import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { Task, STATUS_CYCLE } from "../types";
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
  replaceAll: (tasks: Task[]) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loaded: false,

  load: async () => {
    const saved = await storageGet<Task[]>("tasks");
    // 兼容旧数据：补齐新字段默认值
    const tasks = (saved ?? []).map((t) => ({
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
    const patch: Partial<Task> = { status: nextStatus };
    // 切换到 done 时记录完成时间
    if (nextStatus === "done") patch.completedAt = new Date().toISOString();
    get().updateTask(id, patch);
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
    const tasks = get().tasks.filter((t) => t.groupId === groupId);
    return tasks.sort((a, b) => {
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

  replaceAll: async (tasks) => {
    set({ tasks });
    await storageSet("tasks", tasks);
  },
}));
