import { useState, useRef, useEffect, useCallback, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Trash2, Check, Pencil, ChevronLeft, ChevronRight,
  Star, Archive, LayoutGrid, Settings, Keyboard, Cloud, Pin, GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useGroupStore } from "../../store/groupStore";
import { useTaskStore } from "../../store/taskStore";
import { useArchiveStore } from "../../store/archiveStore";
import { useSettingsStore } from "../../store/settingsStore";
import { SIDEBAR_RGB, wash } from "../../lib/wallpaper";
import {
  GROUP_COLORS, GROUP_EMOJIS, FAVORITES_GROUP_ID, ARCHIVE_GROUP_ID, OVERVIEW_GROUP_ID, isEnded,
} from "../../types";
import { buildGroupTheme, SYSTEM_ACCENTS, tint, ui } from "../../theme";
import { useGroupTheme } from "../../lib/groupTheme";
import { AppLogo, CountBadge } from "../chrome";
import { isMac } from "../../lib/platform";

interface GroupSidebarProps {
  width: number;
  onWidthChange: (w: number) => void;
  collapsed: boolean;
  onCollapsedChange: (c: boolean) => void;
  onSettingsClick: () => void;
}

const MIN_WIDTH = 168;
const MAX_WIDTH = 280;

export function GroupSidebar({
  width, onWidthChange, collapsed, onCollapsedChange, onSettingsClick,
}: GroupSidebarProps) {
  const { groups, activeGroupId, addGroup, updateGroup, deleteGroup, setActive, reorderGroups } = useGroupStore();
  const { tasks, getFavoritedTasks } = useTaskStore();
  const { archives } = useArchiveStore();
  const { settings, setAlwaysOnTop } = useSettingsStore();
  const theme = useGroupTheme();
  const sidebarBg = settings.wallpaperData
    ? wash(SIDEBAR_RGB, settings.wallpaperMask)
    : ui.sidebar;

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const [colorAnchor, setColorAnchor] = useState<DOMRect | null>(null);

  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  useEffect(() => { if (isAdding) addInputRef.current?.focus(); }, [isAdding]);
  useEffect(() => { if (editingId) editInputRef.current?.focus(); }, [editingId]);

  const favCount = getFavoritedTasks().length;
  const isFavActive = activeGroupId === FAVORITES_GROUP_ID;
  const isArchiveActive = activeGroupId === ARCHIVE_GROUP_ID;
  const isOverviewActive = activeGroupId === OVERVIEW_GROUP_ID;
  const totalArchived = archives.reduce((sum, a) => sum + a.tasks.length, 0);
  const overviewCount = tasks.filter((t) => !isEnded(t.status)).length;

  const groupCount = (id: string) =>
    tasks.filter((t) => t.groupId === id && !isEnded(t.status)).length;

  const handleAdd = () => {
    const name = newName.trim();
    if (name) addGroup(name);
    setNewName("");
    setIsAdding(false);
  };

  const handleEditSave = (id: string) => {
    const name = editName.trim();
    if (name) updateGroup(id, { name });
    setEditingId(null);
  };

  const insertEmoji = (emoji: string, current: string, set: (v: string) => void, input: HTMLInputElement | null) => {
    const start = input?.selectionStart ?? current.length;
    const end = input?.selectionEnd ?? current.length;
    const next = current.slice(0, start) + emoji + current.slice(end);
    set(next);
    requestAnimationFrame(() => {
      const pos = start + emoji.length;
      input?.focus();
      input?.setSelectionRange(pos, pos);
    });
  };

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = width;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const w = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + ev.clientX - dragStartX.current));
      onWidthChange(w);
    };
    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [width, onWidthChange]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleGroupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = groups.findIndex((g) => g.id === active.id);
    const newIndex = groups.findIndex((g) => g.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    reorderGroups(arrayMove(groups, oldIndex, newIndex).map((g) => g.id));
  };

  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center gap-2 flex-shrink-0 relative"
        style={{
          width: 52,
          padding: isMac ? "40px 0 12px" : "12px 0",
          background: sidebarBg,
          borderRight: `1px solid ${theme.line}`,
        }}
      >
        {isMac && (
          <div data-tauri-drag-region style={{ position: "absolute", top: 0, left: 0, right: 0, height: 36 }} />
        )}
        <button
          onClick={() => onCollapsedChange(false)}
          title="展开分组"
          style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: ui.muted }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.05)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <ChevronRight size={16} />
        </button>

        <CollapsedDot title="收藏" active={isFavActive} color={SYSTEM_ACCENTS.favorites} onClick={() => setActive(FAVORITES_GROUP_ID)}>
          <Star size={11} color={isFavActive ? "#fff" : "#999"} fill={isFavActive ? "#fff" : "none"} />
        </CollapsedDot>
        <CollapsedDot title="归档" active={isArchiveActive} color={SYSTEM_ACCENTS.archive} onClick={() => setActive(ARCHIVE_GROUP_ID)}>
          <Archive size={11} color={isArchiveActive ? "#fff" : "#999"} />
        </CollapsedDot>
        <CollapsedDot title="全部任务" active={isOverviewActive} color={SYSTEM_ACCENTS.overview} onClick={() => setActive(OVERVIEW_GROUP_ID)}>
          <LayoutGrid size={11} color={isOverviewActive ? "#fff" : "#999"} />
        </CollapsedDot>

        <div className="flex flex-col gap-2.5 mt-1">
          {groups.map((group) => (
            <button
              key={group.id}
              title={group.name}
              onClick={() => setActive(group.id)}
              style={{
                width: 22, height: 22, borderRadius: "50%",
                backgroundColor: group.color, border: "none",
                boxShadow: activeGroupId === group.id ? `0 0 0 3px ${tint(group.color, 0.28)}` : "none",
                opacity: activeGroupId === group.id ? 1 : 0.72,
                transition: "all 0.15s",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-shrink-0 relative" style={{ width }}>
      <div
        className="flex flex-col w-full overflow-hidden"
        style={{ background: sidebarBg, borderRight: `1px solid ${theme.line}` }}
      >
        <div
          data-tauri-drag-region
          className="flex items-center gap-2.5"
          style={{
            padding: isMac ? "10px 16px 12px 78px" : "14px 16px 12px",
            minHeight: isMac ? 52 : undefined,
          }}
        >
          <AppLogo size={26} />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.03em", color: ui.ink }}>
            iamnote
          </span>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: "4px 10px 8px" }}>
          <NavRow
            active={isFavActive}
            accent={SYSTEM_ACCENTS.favorites}
            onClick={() => { setActive(FAVORITES_GROUP_ID); setEditingId(null); setColorPickerFor(null); }}
            icon={<Star size={15} />}
            label="收藏"
            count={favCount}
          />
          <NavRow
            active={isArchiveActive}
            accent={SYSTEM_ACCENTS.archive}
            onClick={() => { setActive(ARCHIVE_GROUP_ID); setEditingId(null); setColorPickerFor(null); }}
            icon={<Archive size={15} />}
            label="归档"
            count={totalArchived}
          />
          <NavRow
            active={isOverviewActive}
            accent={SYSTEM_ACCENTS.overview}
            onClick={() => { setActive(OVERVIEW_GROUP_ID); setEditingId(null); setColorPickerFor(null); }}
            icon={<LayoutGrid size={15} />}
            label="全部任务"
            count={overviewCount}
          />

          <div className="flex items-center justify-between" style={{ padding: "16px 6px 8px" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: ui.faint, letterSpacing: "0.08em" }}>
              分组
            </span>
            <div className="flex items-center gap-0.5">
              <SidebarIconBtn onClick={() => { setIsAdding(true); setNewName(""); }} title="新建分组">
                <Plus size={14} />
              </SidebarIconBtn>
              <SidebarIconBtn onClick={() => onCollapsedChange(true)} title="折叠">
                <ChevronLeft size={14} />
              </SidebarIconBtn>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd}>
            <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
              {groups.map((group) => {
                const isActive = activeGroupId === group.id;
                const isEditing = editingId === group.id;
                return (
                  <SortableGroupRow
                    key={group.id}
                    id={group.id}
                    isActive={isActive}
                    isEditing={isEditing}
                    name={group.name}
                    color={group.color}
                    count={groupCount(group.id)}
                    canDelete={groups.length > 1}
                    editName={editName}
                    editInputRef={editInputRef}
                    onSelect={() => { setActive(group.id); setEditingId(null); setColorPickerFor(null); }}
                    onEditName={setEditName}
                    onEditSave={() => handleEditSave(group.id)}
                    onEditCancel={() => setEditingId(null)}
                    onStartEdit={() => { setEditingId(group.id); setEditName(group.name); }}
                    onDelete={() => deleteGroup(group.id)}
                    onPickColor={(rect) => {
                      setColorPickerFor(colorPickerFor === group.id ? null : group.id);
                      setColorAnchor(rect);
                    }}
                    onInsertEmoji={(emoji) => insertEmoji(emoji, editName, setEditName, editInputRef.current)}
                  />
                );
              })}
            </SortableContext>
          </DndContext>

          {isAdding && (
            <div style={{ padding: "6px 4px 8px" }}>
              <div className="flex items-center gap-2.5" style={{ padding: "4px 6px" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ddd", flexShrink: 0 }} />
                <input
                  ref={addInputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={handleAdd}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setIsAdding(false); }}
                  placeholder="分组名称..."
                  style={{ flex: 1, fontSize: 13, background: "transparent", borderBottom: `1px solid ${ui.lineStrong}`, color: ui.ink }}
                />
              </div>
              <EmojiBar
                onPick={(emoji) => insertEmoji(emoji, newName, setNewName, addInputRef.current)}
              />
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-between"
          style={{ padding: "10px 14px 12px", borderTop: `1px solid ${ui.line}` }}
        >
          <DockBtn title="设置" onClick={onSettingsClick}><Settings size={16} /></DockBtn>
          <DockBtn title="快捷键" onClick={onSettingsClick}><Keyboard size={16} /></DockBtn>
          <DockBtn title="云端同步" onClick={onSettingsClick}><Cloud size={16} /></DockBtn>
          <DockBtn
            title={settings.alwaysOnTop ? "取消置顶" : "窗口置顶"}
            onClick={() => setAlwaysOnTop(!settings.alwaysOnTop)}
            active={settings.alwaysOnTop}
          >
            <Pin size={16} />
          </DockBtn>
        </div>
      </div>

      {colorPickerFor && colorAnchor && (
        <ColorPicker
          anchor={colorAnchor}
          current={groups.find((g) => g.id === colorPickerFor)?.color ?? ""}
          onPick={(color) => {
            updateGroup(colorPickerFor, { color });
            setColorPickerFor(null);
          }}
          onClose={() => setColorPickerFor(null)}
        />
      )}

      <div
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 4, cursor: "col-resize", zIndex: 10 }}
        onMouseDown={handleResizeMouseDown}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.28)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      />
    </div>
  );
}

function SortableGroupRow({
  id, isActive, isEditing, name, color, count, canDelete,
  editName, editInputRef, onSelect, onEditName, onEditSave, onEditCancel,
  onStartEdit, onDelete, onPickColor, onInsertEmoji,
}: {
  id: string;
  isActive: boolean;
  isEditing: boolean;
  name: string;
  color: string;
  count: number;
  canDelete: boolean;
  editName: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: () => void;
  onEditName: (v: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onPickColor: (rect: DOMRect) => void;
  onInsertEmoji: (emoji: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const colorBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      ref={setNodeRef}
      className="relative"
      style={{
        marginBottom: 2,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        zIndex: isDragging ? 20 : undefined,
      }}
    >
      <div
        className="flex items-center gap-1.5 group/item"
        onClick={() => { if (!isEditing) onSelect(); }}
                    style={navStyle(isActive, color)}
        onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(23,23,23,0.04)"; }}
        onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <button
          {...attributes}
          {...listeners}
          title="拖动排序"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 16, height: 22, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: isActive ? "rgba(255,255,255,0.7)" : "#C4C4C4",
            cursor: "grab", touchAction: "none",
            opacity: isDragging ? 1 : undefined,
          }}
        >
          <GripVertical size={13} />
        </button>

        <button
          ref={colorBtnRef}
          style={{
            width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
            backgroundColor: isActive ? "#fff" : color,
            border: "none", cursor: "pointer",
            boxShadow: isActive ? "none" : `0 0 0 2px ${tint(color, 0.22)}`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            const rect = colorBtnRef.current?.getBoundingClientRect();
            if (rect) onPickColor(rect);
          }}
          title="更改颜色"
        />

        {isEditing ? (
          <input
            ref={editInputRef}
            value={editName}
            onChange={(e) => onEditName(e.target.value)}
            onBlur={onEditSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEditSave();
              if (e.key === "Escape") onEditCancel();
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1, fontSize: 13, background: "transparent",
              borderBottom: `1px solid ${isActive ? "rgba(255,255,255,0.45)" : ui.lineStrong}`,
              color: isActive ? "#fff" : ui.ink,
              minWidth: 0,
            }}
          />
        ) : (
          <span style={{
            flex: 1, fontSize: 13, fontWeight: isActive ? 600 : 500,
            color: isActive ? "#fff" : ui.inkSoft,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {name}
          </span>
        )}

        <div className="hidden group-hover/item:flex items-center gap-0.5">
          <SidebarIconBtn
            inverse={isActive}
            onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
            title="重命名"
          >
            <Pencil size={12} />
          </SidebarIconBtn>
          {canDelete && (
            <SidebarIconBtn
              inverse={isActive}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="删除" danger
            >
              <Trash2 size={12} />
            </SidebarIconBtn>
          )}
        </div>

        {count > 0 && (
          <span className="group-hover/item:hidden">
            <CountBadge inverse={isActive}>{count}</CountBadge>
          </span>
        )}
      </div>

      {isEditing && (
        <div style={{ padding: "4px 8px 6px 28px" }} onClick={(e) => e.stopPropagation()}>
          <EmojiBar onPick={onInsertEmoji} />
        </div>
      )}
    </div>
  );
}

function EmojiBar({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 2,
        padding: 6,
        borderRadius: 10,
        background: ui.card,
        border: `1px solid ${ui.line}`,
      }}
    >
      {GROUP_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          title={emoji}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => { e.stopPropagation(); onPick(emoji); }}
          style={{
            width: 24, height: 24, borderRadius: 6, fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(23,23,23,0.06)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function ColorPicker({
  anchor, current, onPick, onClose,
}: {
  anchor: DOMRect;
  current: string;
  onPick: (color: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const t = setTimeout(() => window.addEventListener("mousedown", h), 50);
    return () => { clearTimeout(t); window.removeEventListener("mousedown", h); };
  }, [onClose]);

  const W = 196;
  let left = anchor.left;
  let top = anchor.bottom + 6;
  if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
  if (top + 160 > window.innerHeight - 8) top = anchor.top - 166;

  return createPortal(
    <div
      ref={ref}
      className="grid grid-cols-6 gap-2"
      style={{
        position: "fixed", left, top, width: W, zIndex: 10000,
        padding: 10, background: ui.surface, borderRadius: 12,
        boxShadow: ui.shadowSoft, border: `1px solid ${ui.line}`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {GROUP_COLORS.map((color) => (
        <button
          key={color}
          style={{
            width: 22, height: 22, borderRadius: "50%", backgroundColor: color,
            border: current.toLowerCase() === color ? "2.5px solid #171717" : "2px solid transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => onPick(color)}
        >
          {current.toLowerCase() === color && <Check size={11} color="#fff" />}
        </button>
      ))}
    </div>,
    document.body
  );
}

function navStyle(active: boolean, accent = ui.accent): CSSProperties {
  const theme = buildGroupTheme(accent);
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    padding: "8px 8px 8px 6px",
    cursor: "pointer",
    background: active ? theme.btnGrad : "transparent",
    boxShadow: active ? theme.btnShadow : "none",
    color: active ? "#fff" : ui.inkSoft,
    transition: "background 0.15s, box-shadow 0.15s",
  };
}

function NavRow({
  active, onClick, icon, label, count, accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  accent?: string;
}) {
  return (
    <div
      onClick={onClick}
      style={{ ...navStyle(active, accent), marginBottom: 4, padding: "8px 10px" }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(23,23,23,0.04)"; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <span style={{ display: "flex", color: active ? "#fff" : ui.muted }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 600 : 500, color: active ? "#fff" : ui.inkSoft }}>
        {label}
      </span>
      {count > 0 && <CountBadge inverse={active}>{count}</CountBadge>}
    </div>
  );
}

function CollapsedDot({
  title, active, onClick, children, color = ui.accent,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 22, height: 22, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: active ? color : tint("#8A8479", 0.16),
        boxShadow: active ? `0 0 0 3px ${tint(color, 0.22)}` : "none",
        border: "none",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function SidebarIconBtn({
  children, onClick, title, danger, inverse,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  danger?: boolean;
  inverse?: boolean;
}) {
  const idle = inverse ? "rgba(255,255,255,0.78)" : ui.muted;
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 24, height: 24, borderRadius: 7,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: idle,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = danger
          ? "rgba(239,68,68,0.16)"
          : inverse ? "rgba(255,255,255,0.16)" : "rgba(23,23,23,0.06)";
        (e.currentTarget as HTMLElement).style.color = danger ? "#EF4444" : inverse ? "#fff" : ui.ink;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
        (e.currentTarget as HTMLElement).style.color = idle;
      }}
    >
      {children}
    </button>
  );
}

function DockBtn({
  children, onClick, title, active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
}) {
  const theme = useGroupTheme();
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 30, height: 30, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: active ? theme.color : ui.faint,
        background: active ? theme.chip : "transparent",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.color = ui.inkSoft;
        (e.currentTarget as HTMLElement).style.background = "rgba(23,23,23,0.05)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = active ? theme.color : ui.faint;
        (e.currentTarget as HTMLElement).style.background = active ? theme.chip : "transparent";
      }}
    >
      {children}
    </button>
  );
}
