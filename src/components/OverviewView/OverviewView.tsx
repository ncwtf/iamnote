import { useState } from "react";
import { useTaskStore } from "../../store/taskStore";
import { useGroupStore } from "../../store/groupStore";
import { TaskItem } from "../TaskList/TaskItem";
import { Task } from "../../types";

type Filter = "all" | "todo" | "in-progress" | "done";

const FILTERS: { key: Filter; label: string; color: string }[] = [
  { key: "all",         label: "全部",   color: "#6B7280" },
  { key: "todo",        label: "待办",   color: "#9CA3AF" },
  { key: "in-progress", label: "进行中", color: "#F59E0B" },
  { key: "done",        label: "已完成", color: "#10B981" },
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
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#FAFAF8" }}>
      {/* 顶部栏 */}
      <div style={{
        padding: "14px 18px 10px",
        borderBottom: "2px solid #6B728030",
        background: "#fff", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#1c1c1e" }}>📋 任务总览</span>
          <span style={{ fontSize: 12, color: "#9CA3AF", background: "#F3F4F6", borderRadius: 10, padding: "1px 8px" }}>
            {allTasks.length} 项
          </span>
        </div>

        {/* 搜索框 */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索任务名称…"
          style={{
            width: "100%", fontSize: 13, padding: "6px 10px",
            border: "1px solid #E5E7EB", borderRadius: 8,
            background: "#FAFAFA", color: "#1c1c1e",
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
                color: filter === f.key ? "#fff" : f.color,
                background: filter === f.key ? f.color : `${f.color}15`,
                transition: "all 0.15s",
              }}
            >
              {f.label}
              <span style={{ marginLeft: 4, opacity: 0.8 }}>{totalCount[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 任务列表 */}
      <div style={{ flex: 1, overflowY: "auto" }}>
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
    <div style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px", background: "#fff",
          borderBottom: collapsed ? "none" : "1px solid rgba(0,0,0,0.04)",
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
