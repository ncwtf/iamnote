import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Trash2, Check, Pencil, ChevronLeft, ChevronRight, Star, Archive } from "lucide-react";
import { useGroupStore } from "../../store/groupStore";
import { useTaskStore } from "../../store/taskStore";
import { useArchiveStore } from "../../store/archiveStore";
import { GROUP_COLORS, FAVORITES_GROUP_ID, ARCHIVE_GROUP_ID } from "../../types";

interface GroupSidebarProps {
  width: number;
  onWidthChange: (w: number) => void;
  collapsed: boolean;
  onCollapsedChange: (c: boolean) => void;
}

const MIN_WIDTH = 150;
const MAX_WIDTH = 280;

export function GroupSidebar({ width, onWidthChange, collapsed, onCollapsedChange }: GroupSidebarProps) {
  const { groups, activeGroupId, addGroup, updateGroup, deleteGroup, setActive } = useGroupStore();
  const { getFavoritedTasks } = useTaskStore();
  const { archives } = useArchiveStore();

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
  const totalArchived = archives.reduce((sum, a) => sum + a.tasks.length, 0);

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

  // ── 折叠状态 ──────────────────────────────────────────────
  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center py-3 gap-2 flex-shrink-0"
        style={{ width: 48, background: "#F0EDE8", borderRight: "1px solid rgba(0,0,0,0.07)" }}
      >
        <button
          onClick={() => onCollapsedChange(false)}
          title="展开分组"
          style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.06)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <ChevronRight size={16} />
        </button>

        {/* 收藏 dot */}
        <button
          title="收藏"
          onClick={() => setActive(FAVORITES_GROUP_ID)}
          style={{
            width: 22, height: 22, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: isFavActive ? "#F59E0B" : "#E5E7EB",
            border: `2.5px solid ${isFavActive ? "#fff" : "transparent"}`,
            boxShadow: isFavActive ? "0 0 0 2px #F59E0B" : "none",
            transition: "all 0.15s",
          }}
        >
          <Star size={11} color={isFavActive ? "#fff" : "#999"} fill={isFavActive ? "#fff" : "none"} />
        </button>

        {/* 归档 dot */}
        <button
          title="归档"
          onClick={() => setActive(ARCHIVE_GROUP_ID)}
          style={{
            width: 22, height: 22, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: isArchiveActive ? "#6B7280" : "#E5E7EB",
            border: `2.5px solid ${isArchiveActive ? "#fff" : "transparent"}`,
            boxShadow: isArchiveActive ? "0 0 0 2px #6B7280" : "none",
            transition: "all 0.15s",
          }}
        >
          <Archive size={11} color={isArchiveActive ? "#fff" : "#999"} />
        </button>

        <div className="flex flex-col gap-2.5 mt-1">
          {groups.map((group) => (
            <button
              key={group.id}
              title={group.name}
              onClick={() => setActive(group.id)}
              style={{
                width: 22, height: 22, borderRadius: "50%",
                backgroundColor: group.color,
                border: `2.5px solid ${activeGroupId === group.id ? "#fff" : "transparent"}`,
                boxShadow: activeGroupId === group.id ? `0 0 0 2px ${group.color}` : "none",
                transition: "all 0.15s",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── 展开状态 ──────────────────────────────────────────────
  return (
    <div className="flex flex-shrink-0 relative" style={{ width }}>
      <div
        className="flex flex-col w-full overflow-hidden"
        style={{ background: "#F0EDE8", borderRight: "1px solid rgba(0,0,0,0.07)" }}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between"
          style={{ padding: "12px 14px 10px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            分组
          </span>
          <div className="flex items-center gap-1">
            <SidebarIconBtn onClick={() => { setIsAdding(true); setNewName(""); }} title="新建分组">
              <Plus size={14} />
            </SidebarIconBtn>
            <SidebarIconBtn onClick={() => onCollapsedChange(true)} title="折叠">
              <ChevronLeft size={14} />
            </SidebarIconBtn>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: "6px 0" }}>
          {/* ── 收藏分组（固定在顶部，不可删除） ─── */}
          <div style={{ padding: "0 8px", marginBottom: 4 }}>
            <div
              onClick={() => { setActive(FAVORITES_GROUP_ID); setEditingId(null); setColorPickerFor(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                borderRadius: 8, padding: "7px 10px", cursor: "pointer",
                background: isFavActive ? "#fff" : "transparent",
                boxShadow: isFavActive ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { if (!isFavActive) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"; }}
              onMouseLeave={(e) => { if (!isFavActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Star
                size={13}
                color="#F59E0B"
                fill={isFavActive ? "#F59E0B" : "none"}
                style={{ flexShrink: 0 }}
              />
              <span style={{ flex: 1, fontSize: 13, fontWeight: isFavActive ? 600 : 400, color: isFavActive ? "#1c1c1e" : "#555" }}>
                收藏
              </span>
              {favCount > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 600, color: "#F59E0B",
                  background: "#FEF3C7", borderRadius: 8, padding: "1px 6px",
                  flexShrink: 0,
                }}>
                  {favCount}
                </span>
              )}
            </div>
          </div>

          {/* 归档分组（固定在收藏下方） */}
          <div style={{ padding: "0 8px", marginBottom: 4 }}>
            <div
              onClick={() => { setActive(ARCHIVE_GROUP_ID); setEditingId(null); setColorPickerFor(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                borderRadius: 8, padding: "7px 10px", cursor: "pointer",
                background: isArchiveActive ? "#fff" : "transparent",
                boxShadow: isArchiveActive ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { if (!isArchiveActive) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"; }}
              onMouseLeave={(e) => { if (!isArchiveActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Archive
                size={13}
                color="#6B7280"
                style={{ flexShrink: 0 }}
              />
              <span style={{ flex: 1, fontSize: 13, fontWeight: isArchiveActive ? 600 : 400, color: isArchiveActive ? "#1c1c1e" : "#555" }}>
                归档
              </span>
              {totalArchived > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 600, color: "#6B7280",
                  background: "#F3F4F6", borderRadius: 8, padding: "1px 6px",
                  flexShrink: 0,
                }}>
                  {totalArchived}
                </span>
              )}
            </div>
          </div>

          {/* 分割线 */}
          <div style={{ margin: "4px 14px 6px", borderTop: "1px solid rgba(0,0,0,0.07)" }} />

          {/* ── 用户分组 ─── */}
          {groups.map((group) => {
            const isActive = activeGroupId === group.id;
            return (
              <div key={group.id} className="relative" style={{ padding: "0 8px", marginBottom: 2 }}>
                <div
                  className="flex items-center gap-2.5 group/item"
                  onClick={() => { setActive(group.id); setEditingId(null); setColorPickerFor(null); }}
                  style={{
                    borderRadius: 8, padding: "7px 10px", cursor: "pointer",
                    background: isActive ? "#fff" : "transparent",
                    boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {/* 颜色点 */}
                  <button
                    style={{
                      width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
                      backgroundColor: group.color, border: "1.5px solid rgba(0,0,0,0.1)", cursor: "pointer",
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
                      style={{ flex: 1, fontSize: 13, background: "transparent", borderBottom: "1px solid #ccc", color: "#1c1c1e" }}
                    />
                  ) : (
                    <span style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? "#1c1c1e" : "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {group.name}
                    </span>
                  )}

                  {/* 操作按钮 */}
                  <div className="hidden group-hover/item:flex items-center gap-0.5">
                    <SidebarIconBtn
                      onClick={(e) => { e.stopPropagation(); setEditingId(group.id); setEditName(group.name); }}
                      title="重命名"
                    >
                      <Pencil size={12} />
                    </SidebarIconBtn>
                    {groups.length > 1 && (
                      <SidebarIconBtn
                        onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}
                        title="删除" danger
                      >
                        <Trash2 size={12} />
                      </SidebarIconBtn>
                    )}
                  </div>
                </div>

                {/* 颜色选择器 */}
                {colorPickerFor === group.id && (
                  <div
                    className="absolute left-4 z-30 grid grid-cols-4 gap-2"
                    style={{
                      top: "calc(100% + 4px)", padding: 10,
                      background: "#fff", borderRadius: 10,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {GROUP_COLORS.map((color) => (
                      <button
                        key={color}
                        style={{
                          width: 22, height: 22, borderRadius: "50%", backgroundColor: color,
                          border: group.color === color ? "2.5px solid #1c1c1e" : "2px solid transparent",
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

          {/* 新建输入 */}
          {isAdding && (
            <div className="flex items-center gap-2.5" style={{ padding: "7px 18px" }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ddd", flexShrink: 0 }} />
              <input
                ref={addInputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleAdd}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setIsAdding(false); }}
                placeholder="分组名称..."
                style={{ flex: 1, fontSize: 13, background: "transparent", borderBottom: "1px solid #ccc", color: "#1c1c1e" }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 拖拽把手 */}
      <div
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 4, cursor: "col-resize", zIndex: 10 }}
        onMouseDown={handleResizeMouseDown}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.12)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      />
    </div>
  );
}

function SidebarIconBtn({
  children, onClick, title, danger,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = danger ? "#FEE2E2" : "rgba(0,0,0,0.07)";
        (e.currentTarget as HTMLElement).style.color = danger ? "#EF4444" : "#333";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
        (e.currentTarget as HTMLElement).style.color = "#888";
      }}
    >
      {children}
    </button>
  );
}
