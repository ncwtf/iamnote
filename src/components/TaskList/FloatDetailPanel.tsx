import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, GripHorizontal } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import { Task } from "../../types";
import { useTaskStore } from "../../store/taskStore";
import {
  availableSideWidth,
  getScreenWorkBounds,
  hideHoverPreviewWindow,
  isTauriRuntime,
  listenAppUnfocus,
  listenPreviewHold,
  listenPreviewPointer,
  preferredPreviewHeight,
  preferredPreviewWidth,
  showHoverPreviewWindow,
  taskRectToScreen,
} from "../../lib/hoverPreviewWindow";
import { isMac } from "../../lib/platform";

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
      boxShadow: "0 12px 40px rgba(42,39,35,0.12), 0 2px 6px rgba(42,39,35,0.06)",
      border: `1px solid ${accentColor}30`, background: "#FFFCF7", overflow: "hidden",
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
              ? <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeHighlight]}>{draft}</ReactMarkdown>
              : <span style={{ color: "#D1D5DB", fontStyle: "italic" }}>输入 Markdown 内容…</span>
            }
          </div>
        </div>
      </div>

      <div style={{ padding: "4px 12px", background: "#FAFAFA", borderTop: "1px solid rgba(0,0,0,0.06)", fontSize: 11, color: "#C4C4C4", flexShrink: 0 }}>
        {isMac ? "⌘+Enter" : "Ctrl+Enter"} 保存 · Esc 关闭并自动保存 · 可拖动标题栏移动窗口
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────
// 2. 悬停触发的只读预览气泡（失焦才关，宽度对齐任务区）
// ─────────────────────────────────────────────────────────
const PREVIEW_GAP = 12;
const PREVIEW_EDGE = 8;
const PREVIEW_MIN_W = 240;

interface HoverPreviewProps {
  accentColor: string;
  anchorRect: DOMRect;
  content: string;
  onKeepOpen: () => void;
  onHold?: () => void;
  onReleaseHold?: () => void;
  /** 鼠标离开预览（可带缓冲） */
  onMouseLeave: () => void;
  /** Esc / 窗口失焦 / 滚动：立刻关 */
  onDismiss: () => void;
}

export function HoverPreview({
  accentColor, anchorRect, content, onKeepOpen, onHold, onReleaseHold, onMouseLeave, onDismiss,
}: HoverPreviewProps) {
  const [overlayOk, setOverlayOk] = useState(() => isTauriRuntime());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    const onScroll = () => onDismiss();
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onScroll, true);
    let unfocus: (() => void) | undefined;
    if (isTauriRuntime()) {
      void listenAppUnfocus(onDismiss).then((fn) => { unfocus = fn; });
    } else {
      window.addEventListener("blur", onDismiss);
    }
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("blur", onDismiss);
      unfocus?.();
    };
  }, [onDismiss, overlayOk]);

  useEffect(() => {
    if (!overlayOk) return;
    let cancelled = false;
    (async () => {
      try {
        const [screen, bounds] = await Promise.all([
          taskRectToScreen(anchorRect),
          getScreenWorkBounds(),
        ]);
        if (cancelled) return;
        const sideSpace = availableSideWidth(
          { left: screen.mainLeft, right: screen.mainRight },
          bounds,
        );
        await showHoverPreviewWindow({
          content,
          accentColor,
          width: preferredPreviewWidth(screen.taskWidth, sideSpace),
          height: preferredPreviewHeight(screen.mainBottom - screen.mainTop),
          taskTop: screen.taskTop,
          taskBottom: screen.taskBottom,
          mainLeft: screen.mainLeft,
          mainTop: screen.mainTop,
          mainRight: screen.mainRight,
          mainBottom: screen.mainBottom,
        });
      } catch {
        if (!cancelled) setOverlayOk(false);
      }
    })();
    return () => {
      cancelled = true;
      void hideHoverPreviewWindow();
    };
  }, [overlayOk, accentColor, anchorRect, content]);

  useEffect(() => {
    if (!overlayOk) return;
    let unlisten: (() => void) | undefined;
    void listenPreviewPointer(onKeepOpen, onMouseLeave).then((fn) => { unlisten = fn; });
    return () => unlisten?.();
  }, [overlayOk, onKeepOpen, onMouseLeave]);

  useEffect(() => {
    if (!overlayOk) return;
    let unlisten: (() => void) | undefined;
    void listenPreviewHold((held) => {
      if (held) onHold?.();
      else onReleaseHold?.();
    }).then((fn) => { unlisten = fn; });
    return () => unlisten?.();
  }, [overlayOk, onHold, onReleaseHold]);

  if (overlayOk) return null;

  return (
    <FallbackPreview
      accentColor={accentColor}
      anchorRect={anchorRect}
      content={content}
      onKeepOpen={onKeepOpen}
      onHold={onHold}
      onReleaseHold={onReleaseHold}
      onMouseLeave={onMouseLeave}
    />
  );
}

function FallbackPreview({
  accentColor, anchorRect, content, onKeepOpen, onHold, onReleaseHold, onMouseLeave,
}: {
  accentColor: string;
  anchorRect: DOMRect;
  content: string;
  onKeepOpen: () => void;
  onHold?: () => void;
  onReleaseHold?: () => void;
  onMouseLeave: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spaceRight = vw - PREVIEW_EDGE - (anchorRect.right + PREVIEW_GAP);
  const spaceLeft = anchorRect.left - PREVIEW_GAP - PREVIEW_EDGE;
  const side: "left" | "right" =
    spaceRight >= PREVIEW_MIN_W || spaceRight >= spaceLeft ? "right" : "left";
  const sideSpace = Math.max(PREVIEW_MIN_W, side === "right" ? spaceRight : spaceLeft);
  const initW = Math.max(PREVIEW_MIN_W, Math.min(anchorRect.width, sideSpace, 420));
  let initL = side === "right" ? anchorRect.right + PREVIEW_GAP : anchorRect.left - initW - PREVIEW_GAP;
  if (initL + initW > vw - PREVIEW_EDGE) initL = vw - initW - PREVIEW_EDGE;
  if (initL < PREVIEW_EDGE) initL = PREVIEW_EDGE;
  const initH = Math.max(160, Math.min(360, vh - PREVIEW_EDGE * 2));
  let initT = anchorRect.top;
  if (initT + 80 > vh - PREVIEW_EDGE) initT = Math.max(PREVIEW_EDGE, vh - initH - PREVIEW_EDGE);
  if (initT < PREVIEW_EDGE) initT = PREVIEW_EDGE;

  const [box, setBox] = useState({ left: initL, top: initT, width: initW, height: initH });
  const drag = useRef<{ mx: number; my: number; left: number; top: number } | null>(null);
  const resize = useRef<{ mx: number; my: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (drag.current) {
        setBox((b) => ({
          ...b,
          left: drag.current!.left + e.clientX - drag.current!.mx,
          top: drag.current!.top + e.clientY - drag.current!.my,
        }));
      } else if (resize.current) {
        setBox((b) => ({
          ...b,
          width: Math.max(PREVIEW_MIN_W, resize.current!.w + e.clientX - resize.current!.mx),
          height: Math.max(140, resize.current!.h + e.clientY - resize.current!.my),
        }));
      }
    };
    const onUp = () => {
      if (drag.current || resize.current) onReleaseHold?.();
      drag.current = null;
      resize.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onReleaseHold]);

  return createPortal(
    <div
      ref={boxRef}
      onMouseEnter={onKeepOpen}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        zIndex: 8500,
        border: `1px solid ${accentColor}55`,
        boxShadow: "0 10px 28px rgba(42,39,35,0.12)",
        background: "#FFFCF7",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-resize]")) return;
          onHold?.();
          drag.current = { mx: e.clientX, my: e.clientY, left: box.left, top: box.top };
        }}
        style={{
          padding: "7px 12px",
          background: `linear-gradient(135deg, ${accentColor}22 0%, ${accentColor}0a 100%)`,
          borderBottom: `1px solid ${accentColor}24`,
          fontSize: 10,
          fontWeight: 700,
          color: accentColor,
          letterSpacing: 0.5,
          flexShrink: 0,
          userSelect: "none",
          cursor: "grab",
        }}
      >
        PREVIEW · 拖动移动
      </div>

      <div
        className="md-content github-md"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 16px 14px",
          fontSize: 14,
          lineHeight: 1.7,
          color: "#24292f",
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeHighlight]}
        >
          {content}
        </ReactMarkdown>
      </div>
      <div
        data-resize
        onMouseDown={(e) => {
          e.stopPropagation();
          onHold?.();
          resize.current = { mx: e.clientX, my: e.clientY, w: box.width, h: box.height };
        }}
        style={{
          position: "absolute", right: 0, bottom: 0, width: 16, height: 16, cursor: "nwse-resize",
        }}
      />
    </div>,
    document.body
  );
}
