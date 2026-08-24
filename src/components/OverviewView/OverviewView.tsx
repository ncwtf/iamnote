import { useState } from "react";
import { useTaskStore } from "../../store/taskStore";
import { useGroupStore } from "../../store/groupStore";
import { TaskItem } from "../TaskList/TaskItem";
import { Task } from "../../types";
import { tint, ui } from "../../theme";
import { PageHeader } from "../chrome";

type Filter = "all" | "todo" | "in-progress" | "done" | "cancelled";

const FILTERS: { key: Filter; label: string; color: string }[] = [
  { key: "all",         label: "全部",   color: "#6B7280" },
  { key: "todo",        label: "待办",   color: "#9CA3AF" },
  { key: "in-progress", label: "进行中", color: "#3B82F6" },
  { key: "done",        label: "已完成", color: "#10B981" },
  { key: "cancelled",   label: "已取消", color: "#9CA3AF" },
];

export function OverviewView() {
  const { getAllTasksSorted } = useTaskStore();
  const { groups } = useGroupStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const allTasks = getAllTasksSorted();

  const groupMap = Object.fromEntries(groups.map((g) => [g.id, g]));

  const filtered = allTasks.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search.trim() && !t.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  // 按分组聚合
  const grouped: { group: typeof groups[0]; tasks: Task[] }[] = [];
  for (const g of groups) {
    const tasks = filtered.filter((t) => t.groupId === g.id);
    if (tasks.length > 0) grouped.push({ group: g, tasks });
  }
  // 孤儿任务（分组已删除）
  const orphans = filtered.filter((t) => !groupMap[t.groupId]);

  const totalCount: Record<Filter, number> = {
    all:          allTasks.length,
    todo:         allTasks.filter((t) => t.status === "todo").length,
    "in-progress": allTasks.filter((t) => t.status === "in-progress").length,
    done:         allTasks.filter((t) => t.status === "done").length,
    cancelled:    allTasks.filter((t) => t.status === "cancelled").length,
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: ui.canvas }}>
      {/* 顶部栏 */}
      <div style={{ flexShrink: 0 }}>
        <PageHeader title="全部任务" count={allTasks.length} />
        <div style={{ padding: "0 22px 12px" }}>

        {/* 搜索框 */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索任务名称…"
          style={{
            width: "100%", fontSize: 13, padding: "7px 11px",
            border: `1px solid ${ui.lineStrong}`, borderRadius: 9,
            background: ui.card, color: ui.ink,
            marginBottom: 10,
          }}
        />

        {/* 筛选标签 */}
        <div style={{ display: "flex", gap: 6 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                fontSize: 12, fontWeight: 600,
                padding: "4px 10px", borderRadius: 20,
                color: filter === f.key ? f.color : ui.muted,
                background: filter === f.key ? tint(f.color, 0.16) : "transparent",
                transition: "all 0.15s",
              }}
            >
              {f.label}
              <span style={{ marginLeft: 4, opacity: 0.8 }}>{totalCount[f.key]}</span>
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* 任务列表 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 16px" }}>
        {filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#C4C4C4", gap: 8 }}>
            <span style={{ fontSize: 32 }}>🔍</span>
            <span style={{ fontSize: 14 }}>没有匹配的任务</span>
          </div>
        ) : (
          <>
            {grouped.map(({ group, tasks }) => (
              <GroupSection key={group.id} name={group.name} color={group.color} tasks={tasks} />
            ))}
            {orphans.length > 0 && (
              <GroupSection name="未分组" color="#9CA3AF" tasks={orphans} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function GroupSection({ name, color, tasks }: { name: string; color: string; tasks: Task[] }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "8px 6px", background: "transparent",
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: "left", fontSize: 12, fontWeight: 700, color: "#6B7280", letterSpacing: 0.5 }}>
          {name}
        </span>
        <span style={{ fontSize: 11, color: "#C4C4C4", background: "#F3F4F6", borderRadius: 8, padding: "1px 6px" }}>
          {tasks.length}
        </span>
      </button>
      {!collapsed && tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          accentColor={color}
          groupBadge={undefined}
        />
      ))}
    </div>
  );
}
