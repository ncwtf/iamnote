import { useState, useRef, useEffect, useCallback, type CSSProperties } from "react";
import {
  Plus, Trash2, Check, Pencil, ChevronLeft, ChevronRight,
  Star, Archive, LayoutGrid, Settings, Keyboard, Cloud, Pin,
} from "lucide-react";
import { useGroupStore } from "../../store/groupStore";
import { useTaskStore } from "../../store/taskStore";
import { useArchiveStore } from "../../store/archiveStore";
import { useSettingsStore } from "../../store/settingsStore";
import { GROUP_COLORS, FAVORITES_GROUP_ID, ARCHIVE_GROUP_ID, OVERVIEW_GROUP_ID, isEnded } from "../../types";
import { tint, ui } from "../../theme";
import { AppLogo, CountBadge } from "../chrome";

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
  const { groups, activeGroupId, addGroup, updateGroup, deleteGroup, setActive } = useGroupStore();
  const { tasks, getFavoritedTasks } = useTaskStore();
  const { archives } = useArchiveStore();
  const { settings, setAlwaysOnTop } = useSettingsStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);

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

  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center py-3 gap-2 flex-shrink-0"
        style={{ width: 52, background: ui.sidebar, borderRight: `1px solid ${ui.line}` }}
      >
        <button
          onClick={() => onCollapsedChange(false)}
          title="展开分组"
          style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: ui.muted }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.05)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <ChevronRight size={16} />
        </button>

        <CollapsedDot title="收藏" active={isFavActive} onClick={() => setActive(FAVORITES_GROUP_ID)}>
          <Star size={11} color={isFavActive ? "#fff" : "#999"} fill={isFavActive ? "#fff" : "none"} />
        </CollapsedDot>
        <CollapsedDot title="归档" active={isArchiveActive} onClick={() => setActive(ARCHIVE_GROUP_ID)}>
          <Archive size={11} color={isArchiveActive ? "#fff" : "#999"} />
        </CollapsedDot>
        <CollapsedDot title="全部任务" active={isOverviewActive} onClick={() => setActive(OVERVIEW_GROUP_ID)}>
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
                boxShadow: activeGroupId === group.id ? `0 0 0 3px ${tint(ui.accent, 0.28)}` : "none",
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
        style={{ background: ui.sidebar, borderRight: `1px solid ${ui.line}` }}
      >
        <div
          data-tauri-drag-region
          className="flex items-center gap-2.5"
          style={{ padding: "14px 16px 12px" }}
        >
          <AppLogo size={26} />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.03em", color: ui.ink }}>
            iamnote
          </span>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: "4px 10px 8px" }}>
          <NavRow
            active={isFavActive}
            onClick={() => { setActive(FAVORITES_GROUP_ID); setEditingId(null); setColorPickerFor(null); }}
            icon={<Star size={15} />}
            label="收藏"
            count={favCount}
          />
          <NavRow
            active={isArchiveActive}
            onClick={() => { setActive(ARCHIVE_GROUP_ID); setEditingId(null); setColorPickerFor(null); }}
            icon={<Archive size={15} />}
            label="归档"
            count={totalArchived}
          />
          <NavRow
            active={isOverviewActive}
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

          {groups.map((group) => {
            const isActive = activeGroupId === group.id;
            const count = groupCount(group.id);
            return (
              <div key={group.id} className="relative" style={{ marginBottom: 2 }}>
                <div
                  className="flex items-center gap-2.5 group/item"
                  onClick={() => { setActive(group.id); setEditingId(null); setColorPickerFor(null); }}
                  style={navStyle(isActive)}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(23,23,23,0.04)"; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <button
                    style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      backgroundColor: isActive ? "#fff" : group.color,
                      border: "none", cursor: "pointer",
                      boxShadow: isActive ? "none" : `0 0 0 2px ${tint(group.color, 0.22)}`,
                    }}
                    onClick={(e) => { e.stopPropagation(); setColorPickerFor(colorPickerFor === group.id ? null : group.id); }}
                    title="更改颜色"
                  />

                  {editingId === group.id ? (
                    <input
                      ref={editInputRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleEditSave(group.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditSave(group.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        flex: 1, fontSize: 13, background: "transparent",
                        borderBottom: `1px solid ${isActive ? "rgba(255,255,255,0.45)" : ui.lineStrong}`,
                        color: isActive ? "#fff" : ui.ink,
                      }}
                    />
                  ) : (
                    <span style={{
                      flex: 1, fontSize: 13, fontWeight: isActive ? 600 : 500,
                      color: isActive ? "#fff" : ui.inkSoft,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {group.name}
                    </span>
                  )}

                  <div className="hidden group-hover/item:flex items-center gap-0.5">
                    <SidebarIconBtn
                      inverse={isActive}
                      onClick={(e) => { e.stopPropagation(); setEditingId(group.id); setEditName(group.name); }}
                      title="重命名"
                    >
                      <Pencil size={12} />
                    </SidebarIconBtn>
                    {groups.length > 1 && (
                      <SidebarIconBtn
                        inverse={isActive}
                        onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}
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

                {colorPickerFor === group.id && (
                  <div
                    className="absolute left-3 z-30 grid grid-cols-4 gap-2"
                    style={{
                      top: "calc(100% + 4px)", padding: 10,
                      background: ui.surface, borderRadius: 12,
                      boxShadow: ui.shadowSoft,
                      border: `1px solid ${ui.line}`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {GROUP_COLORS.map((color) => (
                      <button
                        key={color}
                        style={{
                          width: 22, height: 22, borderRadius: "50%", backgroundColor: color,
                          border: group.color === color ? "2.5px solid #171717" : "2px solid transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                        onClick={() => { updateGroup(group.id, { color }); setColorPickerFor(null); }}
                      >
                        {group.color === color && <Check size={11} color="#fff" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {isAdding && (
            <div className="flex items-center gap-2.5" style={{ padding: "8px 10px" }}>
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

      <div
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 4, cursor: "col-resize", zIndex: 10 }}
        onMouseDown={handleResizeMouseDown}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.28)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      />
    </div>
  );
}

function navStyle(active: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
    background: active ? ui.accentGrad : "transparent",
    boxShadow: active ? ui.accentShadow : "none",
    color: active ? "#fff" : ui.inkSoft,
    transition: "background 0.15s, box-shadow 0.15s",
  };
}

function NavRow({
  active, onClick, icon, label, count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div
      onClick={onClick}
      style={{ ...navStyle(active), marginBottom: 4 }}
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
  title, active, onClick, children,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 22, height: 22, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: active ? ui.accent : tint("#8A8479", 0.16),
        boxShadow: active ? `0 0 0 3px ${tint(ui.accent, 0.22)}` : "none",
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
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 30, height: 30, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: active ? ui.accent : ui.faint,
        background: active ? "rgba(59,130,246,0.12)" : "transparent",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.color = ui.inkSoft;
        (e.currentTarget as HTMLElement).style.background = "rgba(23,23,23,0.05)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = active ? ui.accent : ui.faint;
        (e.currentTarget as HTMLElement).style.background = active ? "rgba(59,130,246,0.12)" : "transparent";
      }}
    >
      {children}
    </button>
  );
}
