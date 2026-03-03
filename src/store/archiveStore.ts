import { create } from "zustand";
import { ArchiveMonth, ArchivedTask, Group, Task, yearMonthLabel } from "../types";
import { storageGet, storageSet } from "../lib/storage";

interface ArchiveState {
  archives: ArchiveMonth[];          // 按 yearMonth 降序
  loaded: boolean;
  selectedYearMonth: string | null;  // 当前查看的月份

  load: () => Promise<void>;
  /** 执行归档：从 doneTasks 生成快照，存入 targetYearMonth，返回被归档的 id 列表 */
  archiveTasks: (
    doneTasks: Task[],
    groups: Group[],
    targetYearMonth: string
  ) => Promise<string[]>;
  setSelectedMonth: (ym: string | null) => void;
  getSelectedArchive: () => ArchiveMonth | undefined;
}

export const useArchiveStore = create<ArchiveState>((set, get) => ({
  archives: [],
  loaded: false,
  selectedYearMonth: null,

  load: async () => {
    const saved = await storageGet<ArchiveMonth[]>("archives");
    const archives = (saved ?? []).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
    const selectedYearMonth = archives[0]?.yearMonth ?? null;
    set({ archives, loaded: true, selectedYearMonth });
  },

  archiveTasks: async (doneTasks, groups, targetYearMonth) => {
    if (doneTasks.length === 0) return [];

    const now = new Date().toISOString();
    const groupMap = new Map(groups.map((g) => [g.id, g]));

    const snapshots: ArchivedTask[] = doneTasks.map((t) => {
      const g = groupMap.get(t.groupId);
      return {
        id: t.id,
        groupId: t.groupId,
        groupName: g?.name ?? "已删除分组",
        groupColor: g?.color ?? "#9CA3AF",
        title: t.title,
        detail: t.detail ?? "",
        createdAt: t.createdAt,
        completedAt: t.completedAt,
        archivedAt: now,
      };
    });

    const { archives } = get();
    const existing = archives.find((a) => a.yearMonth === targetYearMonth);

    let updated: ArchiveMonth[];
    if (existing) {
      // 合并到现有月份（去重）
      const existingIds = new Set(existing.tasks.map((t) => t.id));
      const newSnaps = snapshots.filter((s) => !existingIds.has(s.id));
      updated = archives.map((a) =>
        a.yearMonth === targetYearMonth
          ? { ...a, tasks: [...a.tasks, ...newSnaps] }
          : a
      );
    } else {
      // 新建月份
      const newMonth: ArchiveMonth = {
        yearMonth: targetYearMonth,
        label: yearMonthLabel(targetYearMonth),
        tasks: snapshots,
      };
      updated = [...archives, newMonth].sort((a, b) =>
        b.yearMonth.localeCompare(a.yearMonth)
      );
    }

    set({ archives: updated, selectedYearMonth: targetYearMonth });
    await storageSet("archives", updated);

    return doneTasks.map((t) => t.id);
  },

  setSelectedMonth: (ym) => set({ selectedYearMonth: ym }),

  getSelectedArchive: () => {
    const { archives, selectedYearMonth } = get();
    return archives.find((a) => a.yearMonth === selectedYearMonth);
  },
}));
