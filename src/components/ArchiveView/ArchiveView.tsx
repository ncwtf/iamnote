import { Archive, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useArchiveStore } from "../../store/archiveStore";
import { useTaskStore } from "../../store/taskStore";
import { useGroupStore } from "../../store/groupStore";
import { useSettingsStore } from "../../store/settingsStore";
import { ArchivedTask, toYearMonth } from "../../types";

// ── 已归档任务行（只读） ──────────────────────────────────────
function ArchivedTaskRow({ task }: { task: ArchivedTask }) {
  const [expanded, setExpanded] = useState(false);

  function fmt(iso: string | null) {
    if (!iso) return null;
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  return (
    <div
      style={{
        padding: "9px 18px",
        borderBottom: "1px solid rgba(0,0,0,0.04)",
        cursor: "pointer",
      }}
      onClick={() => setExpanded((v) => !v)}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.02)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* 完成勾 */}
        <div style={{
          width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
          backgroundColor: task.groupColor, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <span style={{
          flex: 1, fontSize: 14, color: "#9CA3AF",
          textDecoration: "line-through", textDecorationColor: "#D1D5DB",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {task.title}
        </span>

        {/* 分组徽标 */}
        <span style={{
          fontSize: 11, fontWeight: 600, color: task.groupColor,
          background: `${task.groupColor}18`, borderRadius: 4, padding: "1px 6px",
          flexShrink: 0,
        }}>
          {task.groupName}
        </span>

        {/* 展开/收起 */}
        {expanded
          ? <ChevronDown size={12} color="#D1D5DB" style={{ flexShrink: 0 }} />
          : <ChevronRight size={12} color="#D1D5DB" style={{ flexShrink: 0 }} />}
      </div>

      {/* 时间信息（展开显示） */}
      {expanded && (
        <div style={{ marginTop: 6, marginLeft: 30, display: "flex", gap: 16 }}>
          <span style={{ fontSize: 11, color: "#C4C4C4" }}>创建 {fmt(task.createdAt)}</span>
          {task.completedAt && (
            <span style={{ fontSize: 11, color: "#86EFAC" }}>完成 {fmt(task.completedAt)}</span>
          )}
          <span style={{ fontSize: 11, color: "#D1B8FF" }}>归档 {fmt(task.archivedAt)}</span>
        </div>
      )}
    </div>
  );
}

// ── 主视图 ───────────────────────────────────────────────────
interface ArchiveViewProps {
  onArchiveNow: () => void;
  archiving: boolean;
}

export function ArchiveView({ onArchiveNow, archiving }: ArchiveViewProps) {
  const { archives, selectedYearMonth, setSelectedMonth, getSelectedArchive } = useArchiveStore();
  const { tasks } = useTaskStore();
  const { groups } = useGroupStore();
  useSettingsStore(); // 确保 settings 已加载

  const doneTasks = tasks.filter((t) => t.status === "done");
  const currentArchive = getSelectedArchive();

  // 按分组聚合当前月任务
  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const tasksByGroup = new Map<string, ArchivedTask[]>();
  (currentArchive?.tasks ?? []).forEach((t) => {
    const list = tasksByGroup.get(t.groupId) ?? [];
    list.push(t);
    tasksByGroup.set(t.groupId, list);
  });
  const groupIds = Array.from(tasksByGroup.keys()).sort((a, b) => {
    const ga = groupMap.get(a);
    const gb = groupMap.get(b);
    return (ga?.order ?? 999) - (gb?.order ?? 999);
  });

  const thisMonth = toYearMonth(new Date());

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#FAFAF8" }}>
      {/* 顶部栏 */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 18px",
        borderBottom: "2px solid rgba(107,114,128,0.12)",
        background: "#fff", flexShrink: 0,
      }}>
        <Archive size={16} color="#6B7280" />
        <span style={{ fontSize: 16, fontWeight: 700, color: "#1c1c1e", flex: 1 }}>归档</span>

        {doneTasks.length > 0 && (
          <button
            onClick={onArchiveNow}
            disabled={archiving}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              color: "#fff", backgroundColor: "#6B7280",
              boxShadow: "0 2px 6px rgba(107,114,128,0.30)",
              opacity: archiving ? 0.6 : 1, transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => { if (!archiving) (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = archiving ? "0.6" : "1"; }}
          >
            <Archive size={13} />
            {archiving ? "归档中..." : `手动归档 (${doneTasks.length} 项)`}
          </button>
        )}
      </div>

      {archives.length === 0 ? (
        /* 空状态 */
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: 40, textAlign: "center",
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%", backgroundColor: "#F3F4F6",
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
          }}>
            <Archive size={22} color="#9CA3AF" />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#999", marginBottom: 6 }}>暂无归档记录</p>
          <p style={{ fontSize: 13, color: "#bbb" }}>
            {doneTasks.length > 0
              ? `点击「手动归档」可将 ${doneTasks.length} 个已完成任务归档`
              : "每月1日自动归档，或点击「手动归档」立即归档"}
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* 左侧月份列表 */}
          <div style={{
            width: 130, flexShrink: 0, overflowY: "auto",
            borderRight: "1px solid rgba(0,0,0,0.07)",
            background: "#F9FAFB",
            padding: "8px 0",
          }}>
            {archives.map((a) => {
              const isSelected = a.yearMonth === selectedYearMonth;
              const isCurrent = a.yearMonth === thisMonth;
              return (
                <button
                  key={a.yearMonth}
                  onClick={() => setSelectedMonth(a.yearMonth)}
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "8px 14px",
                    background: isSelected ? "#fff" : "transparent",
                    borderLeft: isSelected ? "3px solid #6B7280" : "3px solid transparent",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)"; }}
                  onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? "#1c1c1e" : "#6B7280" }}>
                    {a.label}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                    <span style={{
                      fontSize: 11, color: "#9CA3AF",
                      background: "#F3F4F6", borderRadius: 8, padding: "0 6px",
                    }}>
                      {a.tasks.length} 项
                    </span>
                    {isCurrent && (
                      <span style={{ fontSize: 10, color: "#10B981", fontWeight: 600 }}>本月</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 右侧任务列表 */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {!currentArchive || currentArchive.tasks.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#bbb", fontSize: 13 }}>
                该月份暂无归档任务
              </div>
            ) : (
              groupIds.map((gid) => {
                const gTasks = tasksByGroup.get(gid) ?? [];
                const firstTask = gTasks[0];
                return (
                  <div key={gid}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 18px 5px",
                      borderBottom: `1px solid ${firstTask.groupColor}20`,
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: firstTask.groupColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: firstTask.groupColor }}>{firstTask.groupName}</span>
                      <span style={{ fontSize: 11, color: "#bbb", background: "#F3F4F6", borderRadius: 8, padding: "0 6px" }}>
                        {gTasks.length}
                      </span>
                    </div>
                    {gTasks.map((t) => <ArchivedTaskRow key={t.id} task={t} />)}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
