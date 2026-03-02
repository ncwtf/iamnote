import { useState, useRef, useEffect } from "react";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { useTaskStore } from "../../store/taskStore";
import { TaskItem } from "./TaskItem";
import { Group } from "../../types";

interface TaskListProps {
  group: Group;
  addTriggerRef?: React.RefObject<(() => void) | null>;
}

export function TaskList({ group, addTriggerRef }: TaskListProps) {
  const { getGroupTasks, addTask } = useTaskStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [doneExpanded, setDoneExpanded] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const allTasks = getGroupTasks(group.id);

  // 暴露触发添加的方法，供父组件（快捷键）调用
  useEffect(() => {
    if (addTriggerRef) {
      addTriggerRef.current = () => {
        setIsAdding(true);
        setNewTitle("");
      };
    }
    return () => {
      if (addTriggerRef) addTriggerRef.current = null;
    };
  }, [addTriggerRef]);

  useEffect(() => { if (isAdding) inputRef.current?.focus(); }, [isAdding]);

  const handleAdd = () => {
    const title = newTitle.trim();
    if (title) {
      addTask(group.id, title);
      setNewTitle("");
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setIsAdding(false);
    }
  };

  const pinnedTasks = allTasks.filter((t) => t.pinned && t.status !== "done");
  const activeTasks = allTasks.filter((t) => !t.pinned && t.status !== "done");
  const doneTasks = allTasks.filter((t) => t.status === "done");
  const activeCount = pinnedTasks.length + activeTasks.length;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#FAFAF8" }}>
      {/* 顶部栏 */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px",
          borderBottom: `2px solid ${group.color}30`,
          background: "#fff",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: group.color, flexShrink: 0 }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "#1c1c1e" }}>{group.name}</span>
          {activeCount > 0 && (
            <span style={{
              fontSize: 12, fontWeight: 500, color: "#999",
              background: "#F3F4F6", borderRadius: 10, padding: "1px 8px",
            }}>
              {activeCount} 项
            </span>
          )}
        </div>
        <button
          onClick={() => { setIsAdding(true); setNewTitle(""); }}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            color: "#fff",
            backgroundColor: group.color,
            boxShadow: `0 2px 6px ${group.color}50`,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        >
          <Plus size={14} />
          新建任务
        </button>
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* 新建输入 */}
        {isAdding && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px",
              background: "#fff",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              borderLeft: `3px solid ${group.color}`,
            }}
          >
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px dashed #ccc", flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onBlur={() => { if (!newTitle.trim()) setIsAdding(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setIsAdding(false);
              }}
              placeholder="输入任务名称，Enter 确认..."
              style={{ flex: 1, fontSize: 14, background: "transparent", color: "#1c1c1e" }}
            />
          </div>
        )}

        {/* 空状态 */}
        {allTasks.length === 0 && !isAdding && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: 40, textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: `${group.color}20`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: group.color, opacity: 0.4 }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#999", marginBottom: 6 }}>该分组还没有任务</p>
            <p style={{ fontSize: 13, color: "#bbb", marginBottom: 16 }}>点击右上角「新建任务」开始添加</p>
            <button
              onClick={() => { setIsAdding(true); setNewTitle(""); }}
              style={{ fontSize: 13, color: group.color, fontWeight: 500 }}
            >
              + 新建第一个任务
            </button>
          </div>
        )}

        {/* 置顶任务 */}
        {pinnedTasks.length > 0 && (
          <div>
            <SectionLabel label="📌 置顶" />
            {pinnedTasks.map((task) => (
              <TaskItem key={task.id} task={task} accentColor={group.color} />
            ))}
          </div>
        )}

        {/* 普通任务 */}
        {activeTasks.length > 0 && (
          <div>
            {pinnedTasks.length > 0 && <SectionLabel label="任务" />}
            {activeTasks.map((task) => (
              <TaskItem key={task.id} task={task} accentColor={group.color} />
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* 已完成区域 */}
        {doneTasks.length > 0 && (
          <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", background: "#fff", flexShrink: 0 }}>
            <button
              onClick={() => setDoneExpanded(!doneExpanded)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px",
                fontSize: 12, fontWeight: 600, color: "#999",
                textTransform: "uppercase", letterSpacing: "0.06em",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.025)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="6" stroke="#10B981" strokeWidth="1.5" />
                <path d="M4 7L6 9L10 5" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ flex: 1, textAlign: "left" }}>已完成</span>
              <span style={{ background: "#F3F4F6", borderRadius: 8, padding: "1px 7px", fontSize: 11, fontWeight: 600, color: "#aaa", marginRight: 4 }}>
                {doneTasks.length}
              </span>
              {doneExpanded ? <ChevronDown size={13} color="#bbb" /> : <ChevronRight size={13} color="#bbb" />}
            </button>

            {doneExpanded && (
              <div style={{ maxHeight: 220, overflowY: "auto", borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                {doneTasks.map((task) => (
                  <TaskItem key={task.id} task={task} accentColor="#10B981" compact />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ padding: "8px 14px 4px", fontSize: 11, fontWeight: 700, color: "#bbb", letterSpacing: "0.06em", textTransform: "uppercase" }}>
      {label}
    </div>
  );
}
