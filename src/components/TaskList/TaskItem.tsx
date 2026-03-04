import { useState, useRef, useEffect, forwardRef } from "react";
import { Pin, Trash2, Pencil, Star, FileText, ChevronRight, Settings2, Bell, RotateCcw, CalendarClock } from "lucide-react";
import { Task } from "../../types";
import { useTaskStore } from "../../store/taskStore";
import { FloatDetailPanel, HoverPreview } from "./FloatDetailPanel";
import { TaskOptionsPanel } from "./TaskOptionsPanel";

interface TaskItemProps {
  task: Task;
  accentColor: string;
  compact?: boolean;
  groupBadge?: { name: string; color: string };
}

// ── 时间格式化 ────────────────────────────────────────────
function fmt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── 状态点 ────────────────────────────────────────────────
function StatusDot({ status, accentColor, onClick, onRightClick }: {
  status: Task["status"];
  accentColor: string;
  onClick: () => void;
  onRightClick: (e: React.MouseEvent) => void;
}) {
  const base: React.CSSProperties = {
    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    transition: "transform 0.12s", border: "2px solid", userSelect: "none",
  };
  const handleContextMenu = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); onRightClick(e); };
  const tip: Record<Task["status"], string> = {
    "todo": "左键→进行中 / 右键→完成",
    "in-progress": "左键→完成 / 右键→待办",
    "done": "左键→待办 / 右键→进行中",
  };
  if (status === "done") return (
    <button onClick={onClick} onContextMenu={handleContextMenu} title={tip[status]}
      style={{ ...base, backgroundColor: accentColor, borderColor: accentColor }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.12)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
  if (status === "in-progress") return (
    <button onClick={onClick} onContextMenu={handleContextMenu} title={tip[status]}
      style={{ ...base, backgroundColor: "#FFF8E8", borderColor: "#F59E0B" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.12)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#F59E0B" }} />
    </button>
  );
  return (
    <button onClick={onClick} onContextMenu={handleContextMenu} title={tip[status]}
      style={{ ...base, backgroundColor: "#fff", borderColor: "#D1D5DB" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = accentColor; (e.currentTarget as HTMLElement).style.transform = "scale(1.12)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#D1D5DB"; (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
    />
  );
}

// ── 任务项主体 ────────────────────────────────────────────
export function TaskItem({ task, accentColor, compact = false, groupBadge }: TaskItemProps) {
  const { cycleStatus, reverseCycleStatus, togglePin, toggleFavorite, deleteTask, updateTask } = useTaskStore();

  // 标题编辑
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (isEditing) inputRef.current?.focus(); }, [isEditing]);

  const handleEditSave = () => {
    const title = editTitle.trim();
    if (title && title !== task.title) updateTask(task.id, { title });
    else setEditTitle(task.title);
    setIsEditing(false);
  };

  // hover（操作按钮显隐）
  const [hovered, setHovered] = useState(false);

  // 悬停预览气泡
  const taskRef = useRef<HTMLDivElement>(null);
  const [previewRect, setPreviewRect] = useState<DOMRect | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPreview = () => {
    if (!task.detail?.trim()) return;
    previewTimerRef.current = setTimeout(() => {
      const rect = taskRef.current?.getBoundingClientRect();
      if (rect) setPreviewRect(rect);
    }, 350);
  };

  const hidePreview = () => {
    clearTimeout(previewTimerRef.current!);
    setPreviewRect(null);
  };

  // 点击触发的编辑浮窗
  const [editAnchor, setEditAnchor] = useState<DOMRect | null>(null);
  const detailBtnRef = useRef<HTMLButtonElement>(null);
  const chevronBtnRef = useRef<HTMLButtonElement>(null);

  const openEdit = (ref: React.RefObject<HTMLButtonElement | null>) => {
    hidePreview();
    const rect = ref.current?.getBoundingClientRect();
    if (rect) setEditAnchor(rect);
  };

  // 任务选项浮窗
  const [optionsAnchor, setOptionsAnchor] = useState<DOMRect | null>(null);
  const optionsBtnRef = useRef<HTMLButtonElement>(null);

  const openOptions = () => {
    const rect = optionsBtnRef.current?.getBoundingClientRect();
    if (rect) setOptionsAnchor(rect);
  };

  const hasDetail = !!(task.detail?.trim());
  const isDone = task.status === "done";
  const py = compact ? 6 : 10;

  // meta 指示器
  const hasRecurring = task.recurringEnabled;
  const hasPeriodic  = task.periodicEnabled;
  const hasReminder  = !!task.reminderAt && !task.reminderFired;

  return (
    <>
      <div
        ref={taskRef}
        onMouseEnter={() => { setHovered(true); showPreview(); }}
        onMouseLeave={() => { setHovered(false); hidePreview(); }}
        style={{
          borderBottom: "1px solid rgba(0,0,0,0.05)",
          background: hovered ? "rgba(0,0,0,0.018)" : "transparent",
          transition: "background 0.12s",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: `${py}px 14px` }}>
          {/* 状态点 */}
          <div style={{ paddingTop: 2, flexShrink: 0 }}>
            <StatusDot
              status={task.status}
              accentColor={accentColor}
              onClick={() => cycleStatus(task.id)}
              onRightClick={() => reverseCycleStatus(task.id)}
            />
          </div>

          {/* 内容区 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* 标题行 */}
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {/* ▶ 指示：有备注时着色，始终占位 */}
              {!compact && (
                <button
                  ref={chevronBtnRef}
                  onClick={() => openEdit(chevronBtnRef)}
                  title={hasDetail ? "查看/编辑备注" : "添加备注"}
                  tabIndex={-1}
                  style={{
                    flexShrink: 0, width: 14, height: 14,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: hasDetail ? `${accentColor}70` : "transparent",
                    cursor: hasDetail ? "pointer" : "default",
                    borderRadius: 3, transition: "color 0.15s, background 0.12s",
                    pointerEvents: hasDetail ? "auto" : "none",
                  }}
                  onMouseEnter={(e) => { if (hasDetail) (e.currentTarget as HTMLElement).style.background = `${accentColor}15`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <ChevronRight size={12} />
                </button>
              )}

              {/* 标题 */}
              {isEditing ? (
                <input
                  ref={inputRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleEditSave}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleEditSave();
                    if (e.key === "Escape") { setEditTitle(task.title); setIsEditing(false); }
                  }}
                  style={{ flex: 1, minWidth: 0, fontSize: 14, background: "transparent", borderBottom: "1.5px solid #ccc", color: "#1c1c1e", paddingBottom: 1 }}
                />
              ) : (
                <span
                  onClick={() => { setIsEditing(true); setEditTitle(task.title); }}
                  title="点击编辑标题"
                  style={{
                    flex: 1, minWidth: 0, display: "block",
                    fontSize: 14, lineHeight: 1.4,
                    color: isDone ? "#B0B0B0" : "#1c1c1e",
                    textDecoration: isDone ? "line-through" : "none",
                    textDecorationColor: "#C0C0C0",
                    cursor: "text",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {task.title}
                </span>
              )}
            </div>

            {/* 标签行（含 meta 指示器） */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: compact ? 2 : 4, paddingLeft: compact ? 0 : 17 }}>
              {groupBadge && (
                <span style={{ fontSize: 11, fontWeight: 600, color: groupBadge.color, background: `${groupBadge.color}18`, borderRadius: 4, padding: "1px 6px" }}>
                  {groupBadge.name}
                </span>
              )}
              {!compact && task.status === "in-progress" && (
                <span style={{ fontSize: 11, fontWeight: 600, color: "#D97706", background: "#FFF8E8", borderRadius: 4, padding: "1px 6px" }}>进行中</span>
              )}
              {!compact && task.pinned && (
                <span style={{ fontSize: 11, fontWeight: 600, color: "#3B82F6", background: "#EFF6FF", borderRadius: 4, padding: "1px 6px" }}>置顶</span>
              )}
              {/* meta 小标签 */}
              {hasRecurring && (
                <span title={`已完成 ${task.recurringCount} 次`} style={{ fontSize: 11, fontWeight: 600, color: "#3B82F6", background: "#EFF6FF", borderRadius: 4, padding: "1px 6px", display: "flex", alignItems: "center", gap: 3 }}>
                  <RotateCcw size={10} /> {task.recurringCount > 0 ? `×${task.recurringCount}` : "循环"}
                </span>
              )}
              {hasReminder && (
                <span title={`提醒：${fmtDatetime(task.reminderAt!)}`} style={{ fontSize: 11, fontWeight: 600, color: "#F59E0B", background: "#FFF8E8", borderRadius: 4, padding: "1px 6px", display: "flex", alignItems: "center", gap: 3 }}>
                  <Bell size={10} /> {fmtDatetime(task.reminderAt!)}
                </span>
              )}
              {hasPeriodic && task.nextDueAt && (
                <span title={`下次：${fmtDatetime(task.nextDueAt)}`} style={{ fontSize: 11, fontWeight: 600, color: "#8B5CF6", background: "#F5F3FF", borderRadius: 4, padding: "1px 6px", display: "flex", alignItems: "center", gap: 3 }}>
                  <CalendarClock size={10} /> {fmtDatetime(task.nextDueAt)}
                </span>
              )}
            </div>

            {/* 时间 */}
            {!compact && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 3, paddingLeft: 17 }}>
                <span style={{ fontSize: 11, color: "#C4C4C4" }}>创建 {fmt(task.createdAt)}</span>
                {task.completedAt && (
                  <span style={{ fontSize: 11, color: "#86EFAC" }}>完成 {fmt(task.completedAt)}</span>
                )}
              </div>
            )}
          </div>

          {/* 操作按钮：hover 渐显，2×3（普通）/ 2×2（compact）网格 */}
          <div style={{
            display: "grid",
            gridTemplateColumns: compact ? "repeat(2, 30px)" : "repeat(3, 30px)",
            gridTemplateRows:    compact ? "repeat(2, 30px)" : "repeat(2, 30px)",
            gap: 2,
            flexShrink: 0,
            alignSelf: "center",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.15s",
            pointerEvents: hovered ? "auto" : "none",
          }}>
            {/* 行1 */}
            <ActionBtn onClick={() => { setIsEditing(true); setEditTitle(task.title); }} title="编辑标题">
              <Pencil size={15} />
            </ActionBtn>
            {compact ? (
              <ActionBtn onClick={() => toggleFavorite(task.id)} title={task.favorited ? "取消收藏" : "收藏"} active={task.favorited} activeColor="#F59E0B">
                <Star size={15} fill={task.favorited ? "#F59E0B" : "none"} />
              </ActionBtn>
            ) : (
              <>
                <ActionBtn onClick={() => togglePin(task.id)} title={task.pinned ? "取消置顶" : "置顶"} active={task.pinned} activeColor="#3B82F6">
                  <Pin size={15} />
                </ActionBtn>
                <ActionBtn onClick={() => toggleFavorite(task.id)} title={task.favorited ? "取消收藏" : "收藏"} active={task.favorited} activeColor="#F59E0B">
                  <Star size={15} fill={task.favorited ? "#F59E0B" : "none"} />
                </ActionBtn>
              </>
            )}

            {/* 行2 */}
            <ActionBtn
              ref={detailBtnRef}
              onClick={() => openEdit(detailBtnRef)}
              title="查看/编辑备注"
              active={!!editAnchor}
              activeColor={accentColor}
            >
              <FileText size={15} />
            </ActionBtn>
            {compact ? (
              <ActionBtn onClick={() => deleteTask(task.id)} title="删除" danger>
                <Trash2 size={15} />
              </ActionBtn>
            ) : (
              <>
                <ActionBtn
                  ref={optionsBtnRef}
                  onClick={openOptions}
                  title="任务选项（循环/提醒/周期）"
                  active={!!optionsAnchor}
                  activeColor="#6B7280"
                >
                  <Settings2 size={15} />
                </ActionBtn>
                <ActionBtn onClick={() => deleteTask(task.id)} title="删除" danger>
                  <Trash2 size={15} />
                </ActionBtn>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 悬停预览气泡（普通任务 + 已完成区均支持） */}
      {previewRect && !editAnchor && hasDetail && (
        <HoverPreview
          accentColor={accentColor}
          anchorRect={previewRect}
          content={task.detail}
        />
      )}

      {/* 点击触发的备注编辑浮窗（compact 模式也支持，Feature 5） */}
      {editAnchor && (
        <FloatDetailPanel
          task={task}
          accentColor={accentColor}
          anchorRect={editAnchor}
          onClose={() => setEditAnchor(null)}
        />
      )}

      {/* 任务选项浮窗 */}
      {optionsAnchor && (
        <TaskOptionsPanel
          task={task}
          anchorRect={optionsAnchor}
          onClose={() => setOptionsAnchor(null)}
        />
      )}
    </>
  );
}

function fmtDatetime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── 操作按钮 ──────────────────────────────────────────────
const ActionBtn = forwardRef<HTMLButtonElement, {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  active?: boolean;
  activeColor?: string;
  danger?: boolean;
}>(function ActionBtn({ children, onClick, title, active, activeColor, danger }, ref) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      title={title}
      style={{
        width: 30, height: 30, borderRadius: 7,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: active ? activeColor : "#999",
        background: active ? `${activeColor}15` : "transparent",
        transition: "all 0.12s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = danger ? "#FEE2E2" : active ? `${activeColor}25` : "rgba(0,0,0,0.07)";
        (e.currentTarget as HTMLElement).style.color = danger ? "#EF4444" : active ? activeColor! : "#333";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = active ? `${activeColor}15` : "transparent";
        (e.currentTarget as HTMLElement).style.color = active ? activeColor! : "#999";
      }}
    >
      {children}
    </button>
  );
});
