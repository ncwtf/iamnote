export const FAVORITES_GROUP_ID = "__favorites__";
export const ARCHIVE_GROUP_ID  = "__archive__";
export const OVERVIEW_GROUP_ID = "__overview__";

export interface Group {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Task {
  id: string;
  groupId: string;
  title: string;
  detail: string;
  status: "todo" | "in-progress" | "done";
  pinned: boolean;
  favorited: boolean;
  order: number;
  createdAt: string;
  completedAt: string | null;

  // ── 可选高级设置（默认均关闭） ──────────────────
  /** 循环计数：每次完成 +1，完成后自动重置为 todo */
  recurringEnabled: boolean;
  /** 累计完成次数 */
  recurringCount: number;

  /** 定时提醒：到达该时间点弹出提示 */
  reminderAt: string | null;
  /** 提醒是否已触发（防止重复弹出） */
  reminderFired: boolean;

  /** 周期循环：完成后在下个周期自动复原 */
  periodicEnabled: boolean;
  periodicType: "daily" | "weekly" | "monthly" | "yearly";
  periodicInterval: number;
  /** 下次到期时间（仅 periodicEnabled 时有意义） */
  nextDueAt: string | null;
}

/** 归档后的任务快照 */
export interface ArchivedTask {
  id: string;
  groupId: string;
  groupName: string;
  groupColor: string;
  title: string;
  detail: string;        // 任务详情快照
  createdAt: string;
  completedAt: string | null;
  archivedAt: string;
}

export interface ArchiveMonth {
  yearMonth: string;
  label: string;
  tasks: ArchivedTask[];
}

export interface Settings {
  alwaysOnTop: boolean;
  autoStart: boolean;
  shortcutAddTask: string;
  shortcutToggleWindow: string;
  syncEnabled: boolean;
  syncFolderPath: string;
  syncLastModifiedAt: string | null;
  syncLastSyncedAt: string | null;
  lastAutoArchiveMonth: string | null;
}

export const STATUS_LABELS: Record<Task["status"], string> = {
  todo: "待办",
  "in-progress": "进行中",
  done: "完成",
};

export const STATUS_CYCLE: Task["status"][] = ["todo", "in-progress", "done"];

export const GROUP_COLORS = [
  "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6",
  "#ef4444", "#ec4899", "#06b6d4", "#84cc16",
];

// ── 工具函数 ──────────────────────────────────────────────

export function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function yearMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

/** 计算下一个周期的到期时间 */
export function calcNextDue(
  from: Date,
  periodicType: Task["periodicType"],
  periodicInterval: number
): Date {
  const d = new Date(from);
  switch (periodicType) {
    case "daily":   d.setDate(d.getDate() + periodicInterval); break;
    case "weekly":  d.setDate(d.getDate() + periodicInterval * 7); break;
    case "monthly": d.setMonth(d.getMonth() + periodicInterval); break;
    case "yearly":  d.setFullYear(d.getFullYear() + periodicInterval); break;
  }
  return d;
}

/** 任务的新字段默认值（兼容旧数据用） */
export const TASK_META_DEFAULTS: Pick<Task,
  "recurringEnabled" | "recurringCount" |
  "reminderAt" | "reminderFired" |
  "periodicEnabled" | "periodicType" | "periodicInterval" | "nextDueAt"
> = {
  recurringEnabled: false,
  recurringCount: 0,
  reminderAt: null,
  reminderFired: false,
  periodicEnabled: false,
  periodicType: "yearly",
  periodicInterval: 1,
  nextDueAt: null,
};
