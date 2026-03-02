import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, GripHorizontal } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Task } from "../../types";
import { useTaskStore } from "../../store/taskStore";

// ─────────────────────────────────────────────────────────
// 1. 点击触发的编辑浮窗
// ─────────────────────────────────────────────────────────
const PANEL_W = 500;
const PANEL_H = 340;

interface FloatDetailPanelProps {
  task: Task;
  accentColor: string;
  anchorRect: DOMRect;
  onClose: () => void;
}

export function FloatDetailPanel({ task, accentColor, anchorRect, onClose }: FloatDetailPanelProps) {
  const { updateTask } = useTaskStore();
  const [draft, setDraft] = useState(task.detail ?? "");
  const [isDirty, setIsDirty] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const dragging = useRef(false);
  const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 初始定位
  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = anchorRect.right + 10;
    let y = anchorRect.top - 8;
    if (x + PANEL_W > vw - 10) x = anchorRect.left - PANEL_W - 10;
    if (x < 10) x = Math.max(10, (vw - PANEL_W) / 2);
    if (y + PANEL_H > vh - 10) y = vh - PANEL_H - 10;
    if (y < 10) y = 10;
    setPos({ x, y });
    setReady(true);
  }, [anchorRect]);

  useEffect(() => { if (ready) textareaRef.current?.focus(); }, [ready]);
  useEffect(() => { if (!isDirty) setDraft(task.detail ?? ""); }, [task.detail, isDirty]);

  const doSave = useCallback(() => {
    updateTask(task.id, { detail: draft });
    setIsDirty(false);
  }, [draft, task.id, updateTask]);

  const handleClose = useCallback(() => {
    if (isDirty) updateTask(task.id, { detail: draft });
    onClose();
  }, [isDirty, draft, task.id, updateTask, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); handleClose(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") doSave();
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [handleClose, doSave]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) handleClose();
    };
    const t = setTimeout(() => window.addEventListener("mousedown", handler), 150);
    return () => { clearTimeout(t); window.removeEventListener("mousedown", handler); };
  }, [handleClose]);

  // 拖动
  const onHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragging.current = true;
    dragOrigin.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: dragOrigin.current.px + e.clientX - dragOrigin.current.mx, y: dragOrigin.current.py + e.clientY - dragOrigin.current.my });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  if (!ready) return null;

  return createPortal(
    <div ref={panelRef} style={{
      position: "fixed", left: pos.x, top: pos.y, width: PANEL_W,
      zIndex: 9999, display: "flex", flexDirection: "column",
      borderRadius: 12,
      boxShadow: "0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
      border: `1.5px solid ${accentColor}28`, background: "#fff", overflow: "hidden",
    }}>
      {/* 标题栏 */}
      <div onMouseDown={onHeaderMouseDown} style={{
        padding: "9px 12px",
        background: `linear-gradient(135deg, ${accentColor}16 0%, ${accentColor}07 100%)`,
        borderBottom: `1px solid ${accentColor}18`,
        display: "flex", alignItems: "center", gap: 8,
        cursor: "grab", userSelect: "none", flexShrink: 0,
      }}>
        <GripHorizontal size={14} style={{ color: `${accentColor}50`, flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "#1c1c1e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {task.title}
        </span>
        {isDirty && (
          <span style={{ fontSize: 11, color: accentColor, background: `${accentColor}15`, borderRadius: 4, padding: "1px 7px", flexShrink: 0 }}>未保存</span>
        )}
        <button onClick={doSave} style={{ fontSize: 12, fontWeight: 600, color: "#fff", padding: "3px 12px", borderRadius: 5, background: accentColor, flexShrink: 0 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}>保存</button>
        <button onClick={handleClose} title="关闭" style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#FEE2E2"; (e.currentTarget as HTMLElement).style.color = "#EF4444"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#9CA3AF"; }}>
          <X size={14} />
        </button>
      </div>

      {/* 左：编辑 + 右：预览 */}
      <div style={{ display: "flex", height: PANEL_H, overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "#B0B7C3", letterSpacing: 0.8, background: "#FAFAFA", borderBottom: "1px solid rgba(0,0,0,0.05)", flexShrink: 0 }}>MARKDOWN</div>
          <textarea ref={textareaRef} value={draft}
            onChange={(e) => { setDraft(e.target.value); setIsDirty(true); }}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") doSave(); }}
            placeholder={"**粗体**  *斜体*  ~~删除线~~\n`代码`  # 标题\n- 列表项\n> 引用块"}
            style={{ flex: 1, padding: "10px 12px", fontSize: 13, lineHeight: 1.75, fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace", resize: "none", color: "#1c1c1e", background: "#fff", overflowY: "auto" }}
          />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "3px 10px", fontSize: 10, fontWeight: 700, color: `${accentColor}90`, letterSpacing: 0.8, background: `${accentColor}08`, borderBottom: `1px solid ${accentColor}12`, flexShrink: 0 }}>预览</div>
          <div className="md-content" style={{ flex: 1, padding: "10px 12px", fontSize: 13, lineHeight: 1.75, color: "#374151", overflowY: "auto" }}>
            {draft.trim()
              ? <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{draft}</ReactMarkdown>
              : <span style={{ color: "#D1D5DB", fontStyle: "italic" }}>输入 Markdown 内容…</span>
            }
          </div>
        </div>
      </div>

      <div style={{ padding: "4px 12px", background: "#FAFAFA", borderTop: "1px solid rgba(0,0,0,0.06)", fontSize: 11, color: "#C4C4C4", flexShrink: 0 }}>
        Ctrl+Enter 保存 · Esc 关闭并自动保存 · 可拖动标题栏移动窗口
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────
// 2. 悬停触发的只读预览气泡
// ─────────────────────────────────────────────────────────
interface HoverPreviewProps {
  accentColor: string;
  anchorRect: DOMRect;
  content: string;
}

export function HoverPreview({ accentColor, anchorRect, content }: HoverPreviewProps) {
  const previewW = Math.max(anchorRect.width - 10, 220);
  const left = anchorRect.left + 32;
  const top = anchorRect.bottom + 4;

  return createPortal(
    <div style={{
      position: "fixed", left, top, width: previewW,
      zIndex: 8000, pointerEvents: "none",
      borderRadius: 8,
      border: `1px solid ${accentColor}22`,
      boxShadow: `0 4px 14px rgba(0,0,0,0.09), 0 1px 3px rgba(0,0,0,0.05)`,
      background: "#fff",
      padding: "7px 10px",
      maxHeight: 180, overflow: "hidden",
    }}>
      <div className="md-content" style={{ fontSize: 12.5, lineHeight: 1.7, color: "#4B5563" }}>
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{content}</ReactMarkdown>
      </div>
      {/* 底部渐隐遮罩（内容超长时） */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 28,
        background: "linear-gradient(transparent, #fff)",
        borderRadius: "0 0 8px 8px",
      }} />
    </div>,
    document.body
  );
}
