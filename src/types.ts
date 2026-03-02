export const FAVORITES_GROUP_ID = "__favorites__";
export const ARCHIVE_GROUP_ID = "__archive__";

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
  detail: string;             // Markdown 详细信息
  status: "todo" | "in-progress" | "done";
  pinned: boolean;
  favorited: boolean;
  order: number;
  createdAt: string;
  completedAt: string | null;
}

/** 归档后的任务快照（保存分组信息，防止分组被删后丢失） */
export interface ArchivedTask {
  id: string;          // 原任务 ID
  groupId: string;
  groupName: string;   // 快照，分组名
  groupColor: string;  // 快照，分组颜色
  title: string;
  createdAt: string;
  completedAt: string | null;
  archivedAt: string;  // 归档时间
}

/** 某一归档月份 */
export interface ArchiveMonth {
  yearMonth: string;   // "2024-01"
  label: string;       // "2024年1月"
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
  lastAutoArchiveMonth: string | null; // "2024-01"，防止重复自动归档
}

export const STATUS_LABELS: Record<Task["status"], string> = {
  todo: "待办",
  "in-progress": "进行中",
  done: "完成",
};

export const STATUS_CYCLE: Task["status"][] = ["todo", "in-progress", "done"];

export const GROUP_COLORS = [
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

// ── 归档工具函数 ─────────────────────────────────────────────

/** 由 Date 生成 "YYYY-MM" */
export function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** 由 "YYYY-MM" 生成展示标签，如 "2024年1月" */
export function yearMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}
