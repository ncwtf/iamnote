import { useState, useRef, useEffect } from "react";
import { Plus, ChevronDown, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTaskStore } from "../../store/taskStore";
import { TaskItem } from "./TaskItem";
import { Group, Task, isEnded } from "../../types";
import { ui } from "../../theme";
import { CircleIconBtn, PageHeader, PrimaryBtn } from "../chrome";

interface TaskListProps {
  group: Group;
  addTriggerRef?: React.RefObject<(() => void) | null>;
}

type StatusFilter = "all" | "todo" | "in-progress";

export function TaskList({ group, addTriggerRef }: TaskListProps) {
  const { getGroupTasks, addTask, reorderTasks } = useTaskStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [doneExpanded, setDoneExpanded] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const allTasks = getGroupTasks(group.id);

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
  useEffect(() => { if (showSearch) searchRef.current?.focus(); }, [showSearch]);

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

  const match = (t: Task) => {
    if (query.trim() && !t.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  };

  const pinnedTasks = allTasks.filter((t) => t.pinned && !isEnded(t.status) && match(t));
  const activeTasks = allTasks.filter((t) => !t.pinned && !isEnded(t.status) && match(t));
  const endedTasks = allTasks
    .filter((t) => isEnded(t.status) && match(t))
    .slice()
    .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt));
  const activeCount = allTasks.filter((t) => !isEnded(t.status)).length;
  const cancelledCount = endedTasks.filter((t) => t.status === "cancelled").length;

  const startAdd = () => { setIsAdding(true); setNewTitle(""); };

  const cycleFilter = () => {
    setStatusFilter((prev) => (
      prev === "all" ? "todo" : prev === "todo" ? "in-progress" : "all"
    ));
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: ui.canvas }}>
      <PageHeader
        title={group.name}
        count={activeCount}
        actions={
          <>
            <CircleIconBtn
              title="搜索"
              active={showSearch}
              onClick={() => {
                setShowSearch((v) => {
                  if (v) setQuery("");
                  return !v;
                });
              }}
            >
              <Search size={15} />
            </CircleIconBtn>
            <CircleIconBtn
              title={statusFilter === "all" ? "筛选：全部" : statusFilter === "todo" ? "筛选：待办" : "筛选：进行中"}
              active={statusFilter !== "all"}
              onClick={cycleFilter}
            >
              <SlidersHorizontal size={15} />
            </CircleIconBtn>
            <PrimaryBtn onClick={startAdd}>
              <Plus size={14} />
              新建任务
            </PrimaryBtn>
          </>
        }
      />

      {showSearch && (
        <div style={{ padding: "0 22px 10px" }}>
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索任务名称…"
            style={{
              width: "100%", fontSize: 13, padding: "8px 12px",
              border: `1px solid ${ui.lineStrong}`, borderRadius: 12,
              background: ui.card, color: ui.ink, boxShadow: ui.cardShadow,
            }}
          />
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", padding: "4px 16px 16px" }}>
        {isAdding && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "14px 16px",
              marginBottom: 10,
              background: ui.card,
              borderRadius: 16,
              border: `1px solid ${tintBlue(0.28)}`,
              boxShadow: ui.cardShadow,
            }}
          >
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px dashed #D1D5DB", flexShrink: 0 }} />
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
              style={{ flex: 1, fontSize: 14, background: "transparent", color: ui.ink }}
            />
          </div>
        )}

        {allTasks.length === 0 && !isAdding && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: 40, textAlign: "center" }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: tintBlue(0.10),
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
            }}>
              <Plus size={22} color={ui.accent} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: ui.inkSoft, marginBottom: 6 }}>还没有便签</p>
            <p style={{ fontSize: 13, color: ui.faint, marginBottom: 16 }}>点右上角「新建任务」，或按快捷键添加</p>
            <button onClick={startAdd} style={{ fontSize: 13, color: ui.accent, fontWeight: 600 }}>
              + 新建第一个任务
            </button>
          </div>
        )}

        {pinnedTasks.length > 0 && (
          <div>
            <SectionLabel label="置顶" />
            <SortableTaskSection
              tasks={pinnedTasks}
              accentColor={group.color}
              onReorder={reorderTasks}
            />
          </div>
        )}

        {activeTasks.length > 0 && (
          <div>
            {pinnedTasks.length > 0 && <SectionLabel label="任务" />}
            <SortableTaskSection
              tasks={activeTasks}
              accentColor={group.color}
              onReorder={reorderTasks}
            />
          </div>
        )}

        <div style={{ flex: 1 }} />

        {endedTasks.length > 0 && (
          <div style={{
            marginTop: 8, borderRadius: 16, overflow: "hidden",
            background: "rgba(255,255,255,0.62)", border: `1px solid ${ui.line}`, flexShrink: 0,
          }}>
            <button
              onClick={() => setDoneExpanded(!doneExpanded)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px",
                fontSize: 12, fontWeight: 600, color: ui.muted,
                letterSpacing: "-0.01em",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.025)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="6" stroke="#10B981" strokeWidth="1.5" />
                <path d="M4 7L6 9L10 5" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ flex: 1, textAlign: "left" }}>
                {cancelledCount > 0 ? "已结束" : "已完成"}
              </span>
              <span style={{ background: "rgba(23,23,23,0.06)", borderRadius: 7, padding: "1px 7px", fontSize: 11, fontWeight: 500, color: ui.muted, marginRight: 4 }}>
                {endedTasks.length}
              </span>
              {doneExpanded ? <ChevronDown size={13} color="#bbb" /> : <ChevronRight size={13} color="#bbb" />}
            </button>

            {doneExpanded && (
              <div style={{ maxHeight: 220, overflowY: "auto", borderTop: `1px solid ${ui.line}` }}>
                {endedTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    accentColor={task.status === "cancelled" ? "#9CA3AF" : "#10B981"}
                    compact
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function tintBlue(alpha: number) {
  return `rgba(37, 99, 235, ${alpha})`;
}

function SortableTaskSection({
  tasks,
  accentColor,
  onReorder,
}: {
  tasks: Task[];
  accentColor: string;
  onReorder: (ids: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(tasks, oldIndex, newIndex).map((t) => t.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map((task) => (
          <SortableTaskItem key={task.id} task={task} accentColor={accentColor} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableTaskItem({ task, accentColor }: { task: Task; accentColor: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        zIndex: isDragging ? 20 : undefined,
        position: "relative",
      }}
    >
      <TaskItem
        task={task}
        accentColor={accentColor}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ padding: "4px 6px 8px", fontSize: 12, fontWeight: 600, color: ui.muted }}>
      {label}
    </div>
  );
}
