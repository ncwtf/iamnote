import { useState, useRef, useEffect, forwardRef } from "react";
import { createPortal } from "react-dom";
import {
  Pin, Trash2, Pencil, Star, FileText, Settings2, Bell, RotateCcw,
  CalendarClock, GripVertical, MoreHorizontal,
} from "lucide-react";
import { isEnded, STATUS_LABELS, Task } from "../../types";
import { statusTone, ui } from "../../theme";
import { MetaPill } from "../chrome";
import { useTaskStore } from "../../store/taskStore";
import { useStickyPreview } from "../../lib/useStickyPreview";
import { FloatDetailPanel, HoverPreview } from "./FloatDetailPanel";
import { TaskOptionsPanel } from "./TaskOptionsPanel";

interface TaskItemProps {
  task: Task;
  accentColor: string;
  compact?: boolean;
  groupBadge?: { name: string; color: string };
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}

function fmt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function StatusPicker({ anchorRect, current, accentColor, onSelect, onClose }: {
  anchorRect: DOMRect;
  current: Task["status"];
  accentColor: string;
  onSelect: (s: Task["status"]) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const t = setTimeout(() => window.addEventListener("mousedown", h), 80);
    return () => { clearTimeout(t); window.removeEventListener("mousedown", h); };
  }, [onClose]);

  const W = 120, H = 4 * 38 + 28;
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = anchorRect.right + 6;
  let top = anchorRect.top - 4;
  if (left + W > vw - 6) left = anchorRect.left - W - 6;
  if (top + H > vh - 6) top = vh - H - 6;

  const options: { value: Task["status"]; label: string; dotBg: string; dotBorder: string; inner: React.ReactNode }[] = [
    { value: "todo", label: "待办", dotBg: "#fff", dotBorder: "#D1D5DB", inner: null },
    { value: "in-progress", label: "进行中", dotBg: "#EFF6FF", dotBorder: "#3B82F6",
      inner: <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#3B82F6" }} /> },
    { value: "done", label: "完成", dotBg: accentColor, dotBorder: accentColor,
      inner: <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg> },
    { value: "cancelled", label: "已取消", dotBg: "#F3F4F6", dotBorder: "#9CA3AF",
      inner: <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" /></svg> },
  ];

  return createPortal(
    <div ref={ref} style={{
      position: "fixed", left, top, width: W, zIndex: 10000,
      background: ui.surface, borderRadius: 12,
      boxShadow: ui.shadowSoft,
      border: `1px solid ${ui.line}`,
      padding: "5px 0",
      animation: "hoverPreviewIn 0.12s ease",
    }}>
      <div style={{ padding: "3px 10px 5px", fontSize: 10, fontWeight: 700, color: ui.faint, letterSpacing: 0.5, userSelect: "none" }}>
        切换状态
      </div>
      {options.map((opt) => {
        const isCur = opt.value === current;
        return (
          <button
            key={opt.value}
            onClick={() => { onSelect(opt.value); onClose(); }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px",
              background: isCur ? `${accentColor}14` : "transparent",
              fontSize: 12, fontWeight: isCur ? 600 : 400,
              color: isCur ? ui.ink : "#374151",
            }}
            onMouseEnter={(e) => { if (!isCur) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"; }}
            onMouseLeave={(e) => { if (!isCur) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <div style={{
              width: 15, height: 15, borderRadius: "50%",
              border: `2px solid ${opt.dotBorder}`,
              background: opt.dotBg, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {opt.inner}
            </div>
            {opt.label}
            {isCur && <span style={{ marginLeft: "auto", fontSize: 10, color: accentColor }}>✓</span>}
          </button>
        );
      })}
    </div>,
    document.body
  );
}

function StatusDot({ status, accentColor, onClick, onContextMenuOpen }: {
  status: Task["status"];
  accentColor: string;
  onClick: () => void;
  onContextMenuOpen: (rect: DOMRect) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const base: React.CSSProperties = {
    width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    transition: "transform 0.12s, border-color 0.12s", border: "1.5px solid", userSelect: "none",
  };
  const openPicker = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const rect = ref.current?.getBoundingClientRect();
    if (rect) onContextMenuOpen(rect);
  };
  const scale = (s: string) => (e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.transform = s; };

  if (status === "done") return (
    <button ref={ref} onClick={onClick} onContextMenu={openPicker}
      title="左键循环 · 右键选择状态"
      style={{ ...base, backgroundColor: accentColor, borderColor: accentColor }}
      onMouseEnter={scale("scale(1.12)")} onMouseLeave={scale("scale(1)")}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
  if (status === "in-progress") return (
    <button ref={ref} onClick={onClick} onContextMenu={openPicker}
      title="左键循环 · 右键选择状态"
      style={{ ...base, backgroundColor: "#EFF6FF", borderColor: "#3B82F6" }}
      onMouseEnter={scale("scale(1.12)")} onMouseLeave={scale("scale(1)")}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#3B82F6" }} />
    </button>
  );
  if (status === "cancelled") return (
    <button ref={ref} onClick={onClick} onContextMenu={openPicker}
      title="左键→待办 · 右键选择状态"
      style={{ ...base, backgroundColor: "#F3F4F6", borderColor: "#9CA3AF" }}
      onMouseEnter={scale("scale(1.12)")} onMouseLeave={scale("scale(1)")}>
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
        <path d="M1.5 1.5L7.5 7.5M7.5 1.5L1.5 7.5" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
  return (
    <button ref={ref} onClick={onClick} onContextMenu={openPicker}
      title="左键循环 · 右键选择状态"
      style={{ ...base, backgroundColor: "#fff", borderColor: "#D1D5DB" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = accentColor; (e.currentTarget as HTMLElement).style.transform = "scale(1.12)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#D1D5DB"; (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
    />
  );
}

export function TaskItem({ task, accentColor, compact = false, groupBadge, dragHandleProps }: TaskItemProps) {
  const { cycleStatus, togglePin, toggleFavorite, deleteTask, updateTask, setTaskStatus } = useTaskStore();
  const [pickerRect, setPickerRect] = useState<DOMRect | null>(null);

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

  const [hovered, setHovered] = useState(false);

  const taskRef = useRef<HTMLDivElement>(null);
  const hasDetail = !!(task.detail?.trim());
  const { anchorRect: previewRect, scheduleShow, scheduleHide, keepOpen, hide: hidePreview } =
    useStickyPreview(hasDetail);

  const [editAnchor, setEditAnchor] = useState<DOMRect | null>(null);
  const detailBtnRef = useRef<HTMLButtonElement>(null);

  const openEdit = () => {
    hidePreview();
    const rect = detailBtnRef.current?.getBoundingClientRect();
    if (rect) setEditAnchor(rect);
  };

  const [optionsAnchor, setOptionsAnchor] = useState<DOMRect | null>(null);
  const [moreRect, setMoreRect] = useState<DOMRect | null>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const ended = isEnded(task.status);
  const py = compact ? 7 : 12;

  const hasRecurring = task.recurringEnabled;
  const hasPeriodic = task.periodicEnabled;
  const hasReminder = !!task.reminderAt && !task.reminderFired;
  const tone = statusTone[task.status];

  return (
    <>
      <div
        ref={taskRef}
        onMouseEnter={() => { setHovered(true); scheduleShow(taskRef.current); }}
        onMouseLeave={() => { setHovered(false); scheduleHide(); }}
        style={{
          borderBottom: compact ? `1px solid ${ui.line}` : "none",
          background: compact
            ? (hovered ? "rgba(23,23,23,0.03)" : "transparent")
            : ui.card,
          borderRadius: compact ? 0 : 16,
          boxShadow: compact ? "none" : (hovered ? ui.cardHover : ui.cardShadow),
          transform: !compact && hovered ? "translateY(-1px)" : "none",
          marginBottom: compact ? 0 : 10,
          transition: "background 0.15s, box-shadow 0.15s, transform 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: `${py}px 14px` }}>
          {dragHandleProps && (
            <button
              {...dragHandleProps}
              title="拖动排序"
              tabIndex={-1}
              onPointerDown={(e) => {
                hidePreview();
                dragHandleProps.onPointerDown?.(e);
              }}
              style={{
                width: 16, height: 22, flexShrink: 0, paddingTop: 2,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#C4C4C4", cursor: "grab", touchAction: "none",
                opacity: hovered ? 1 : 0.35,
                transition: "opacity 0.12s",
              }}
            >
              <GripVertical size={14} />
            </button>
          )}

          <div style={{ paddingTop: 2, flexShrink: 0 }}>
            <StatusDot
              status={task.status}
              accentColor={accentColor}
              onClick={() => cycleStatus(task.id)}
              onContextMenuOpen={(rect) => setPickerRect(rect)}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
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
                  style={{ flex: 1, minWidth: 0, fontSize: 14.5, background: "transparent", borderBottom: `1.5px solid ${ui.faint}`, color: ui.ink, paddingBottom: 1 }}
                />
              ) : (
                <span
                  onClick={() => { setIsEditing(true); setEditTitle(task.title); }}
                  title="点击编辑标题"
                  style={{
                    flex: 1, minWidth: 0, display: "block",
                    fontSize: 14.5, lineHeight: 1.45, letterSpacing: "-0.015em", fontWeight: 600,
                    color: ended ? ui.faint : ui.ink,
                    textDecoration: ended ? "line-through" : "none",
                    textDecorationColor: ui.faint,
                    cursor: "text",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {task.title}
                </span>
              )}
            </div>

            {!compact && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 }}>
                <MetaPill color={tone.fg} bg={tone.bg}>{STATUS_LABELS[task.status]}</MetaPill>
                {groupBadge && (
                  <MetaPill color={groupBadge.color} bg={`${groupBadge.color}18`}>{groupBadge.name}</MetaPill>
                )}
                {task.pinned && (
                  <MetaPill color="#DB2777" bg="rgba(244,114,182,0.14)">
                    <Pin size={10} /> 置顶
                  </MetaPill>
                )}
                {hasRecurring && (
                  <MetaPill color="#7C3AED" bg="rgba(139,92,246,0.12)">
                    <RotateCcw size={10} /> {task.recurringCount > 0 ? `循环 ×${task.recurringCount}` : "循环"}
                  </MetaPill>
                )}
                {hasReminder && (
                  <MetaPill color="#D97706" bg="rgba(245,158,11,0.14)">
                    <Bell size={10} /> {friendlyDate(task.reminderAt!)}
                  </MetaPill>
                )}
                {hasPeriodic && task.nextDueAt && (
                  <MetaPill color="#EA580C" bg="rgba(251,146,60,0.16)">
                    <CalendarClock size={10} /> {friendlyDate(task.nextDueAt)}
                  </MetaPill>
                )}
              </div>
            )}

            {compact && (groupBadge || task.status === "cancelled") && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 3 }}>
                {groupBadge && (
                  <MetaPill color={groupBadge.color} bg={`${groupBadge.color}18`}>{groupBadge.name}</MetaPill>
                )}
                {task.status === "cancelled" && (
                  <MetaPill color={ui.muted} bg="rgba(23,23,23,0.06)">已取消</MetaPill>
                )}
              </div>
            )}

            {!compact && hovered && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 5 }}>
                <span style={{ fontSize: 11, color: ui.faint }}>创建 {fmt(task.createdAt)}</span>
                {task.completedAt && task.status === "done" && (
                  <span style={{ fontSize: 11, color: "#059669" }}>完成 {fmt(task.completedAt)}</span>
                )}
                {task.completedAt && task.status === "cancelled" && (
                  <span style={{ fontSize: 11, color: ui.muted }}>取消 {fmt(task.completedAt)}</span>
                )}
              </div>
            )}
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexShrink: 0,
            alignSelf: "center",
          }}>
            <ActionBtn
              ref={detailBtnRef}
              onClick={openEdit}
              title="查看/编辑备注"
              active={!!editAnchor || hasDetail}
              activeColor={hasDetail ? accentColor : ui.faint}
            >
              <FileText size={15} />
            </ActionBtn>
            <ActionBtn
              ref={moreBtnRef}
              onClick={() => {
                const rect = moreBtnRef.current?.getBoundingClientRect();
                if (rect) setMoreRect(rect);
              }}
              title="更多"
              active={!!moreRect}
              activeColor={ui.inkSoft}
            >
              <MoreHorizontal size={15} />
            </ActionBtn>
          </div>
        </div>
      </div>

      {previewRect && !editAnchor && hasDetail && (
        <HoverPreview
          accentColor={accentColor}
          anchorRect={previewRect}
          content={task.detail}
          onKeepOpen={keepOpen}
          onMouseLeave={scheduleHide}
          onDismiss={hidePreview}
        />
      )}

      {editAnchor && (
        <FloatDetailPanel
          task={task}
          accentColor={accentColor}
          anchorRect={editAnchor}
          onClose={() => setEditAnchor(null)}
        />
      )}

      {optionsAnchor && (
        <TaskOptionsPanel
          task={task}
          anchorRect={optionsAnchor}
          onClose={() => setOptionsAnchor(null)}
        />
      )}

      {moreRect && (
        <MoreMenu
          anchorRect={moreRect}
          compact={compact}
          pinned={task.pinned}
          favorited={task.favorited}
          onEditTitle={() => { setIsEditing(true); setEditTitle(task.title); }}
          onPin={() => togglePin(task.id)}
          onFavorite={() => toggleFavorite(task.id)}
          onOptions={() => {
            const rect = moreBtnRef.current?.getBoundingClientRect();
            if (rect) setOptionsAnchor(rect);
          }}
          onDelete={() => deleteTask(task.id)}
          onClose={() => setMoreRect(null)}
        />
      )}

      {pickerRect && (
        <StatusPicker
          anchorRect={pickerRect}
          current={task.status}
          accentColor={accentColor}
          onSelect={(s) => {
            if (s !== task.status) setTaskStatus(task.id, s);
          }}
          onClose={() => setPickerRect(null)}
        />
      )}
    </>
  );
}

function friendlyDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (start(d) - start(now)) / 86400000;
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (diff === 0) return `今天 ${hm}`;
  if (diff === 1) return `明天 ${hm}`;
  if (diff === -1) return `昨天 ${hm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

function MoreMenu({
  anchorRect, compact, pinned, favorited,
  onEditTitle, onPin, onFavorite, onOptions, onDelete, onClose,
}: {
  anchorRect: DOMRect;
  compact: boolean;
  pinned: boolean;
  favorited: boolean;
  onEditTitle: () => void;
  onPin: () => void;
  onFavorite: () => void;
  onOptions: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const t = setTimeout(() => window.addEventListener("mousedown", h), 80);
    return () => { clearTimeout(t); window.removeEventListener("mousedown", h); };
  }, [onClose]);

  const W = 168;
  let left = anchorRect.right - W;
  let top = anchorRect.bottom + 6;
  if (left < 8) left = 8;
  if (top + 220 > window.innerHeight) top = anchorRect.top - 220;

  const items: { key: string; label: string; icon: React.ReactNode; danger?: boolean; hide?: boolean; run: () => void }[] = [
    { key: "edit", label: "编辑标题", icon: <Pencil size={14} />, run: onEditTitle },
    { key: "pin", label: pinned ? "取消置顶" : "置顶", icon: <Pin size={14} />, hide: compact, run: onPin },
    { key: "fav", label: favorited ? "取消收藏" : "收藏", icon: <Star size={14} />, run: onFavorite },
    { key: "opt", label: "循环 / 提醒 / 周期", icon: <Settings2 size={14} />, hide: compact, run: onOptions },
    { key: "del", label: "删除", icon: <Trash2 size={14} />, danger: true, run: onDelete },
  ];

  return createPortal(
    <div ref={ref} style={{
      position: "fixed", left, top, width: W, zIndex: 10000,
      background: ui.surface, borderRadius: 12,
      boxShadow: ui.shadowSoft, border: `1px solid ${ui.line}`,
      padding: 5, animation: "hoverPreviewIn 0.12s ease",
    }}>
      {items.filter((it) => !it.hide).map((it) => (
        <button
          key={it.key}
          onClick={() => { it.run(); onClose(); }}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px", borderRadius: 8, fontSize: 13,
            color: it.danger ? "#EF4444" : ui.inkSoft, textAlign: "left",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = it.danger ? "#FEE2E2" : "rgba(0,0,0,0.04)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          {it.icon}
          {it.label}
        </button>
      ))}
    </div>,
    document.body
  );
}

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
        width: 30, height: 30, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: active ? activeColor : ui.faint,
        background: active ? `${activeColor}15` : "transparent",
        transition: "all 0.12s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = danger ? "#FEE2E2" : active ? `${activeColor}25` : "rgba(0,0,0,0.06)";
        (e.currentTarget as HTMLElement).style.color = danger ? "#EF4444" : active ? activeColor! : ui.ink;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = active ? `${activeColor}15` : "transparent";
        (e.currentTarget as HTMLElement).style.color = active ? activeColor! : ui.faint;
      }}
    >
      {children}
    </button>
  );
});
