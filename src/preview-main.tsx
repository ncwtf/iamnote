import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import { emit, listen } from "@tauri-apps/api/event";
import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { GripHorizontal } from "lucide-react";
import "./App.css";
import {
  PREVIEW_EVENT,
  PREVIEW_FOCUS,
  PREVIEW_HOLD,
  PREVIEW_POINTER,
  placePreviewWindow,
  rememberPreviewSize,
  type HoverPreviewPayload,
} from "./lib/hoverPreviewWindow";

type ResizeDir = "North" | "South" | "East" | "West" | "NorthEast" | "NorthWest" | "SouthEast" | "SouthWest";

function PreviewApp() {
  const [payload, setPayload] = useState<HoverPreviewPayload | null>(null);
  const placedFor = useRef<string | null>(null);
  const userMoved = useRef(false);

  useEffect(() => {
    const un = listen<HoverPreviewPayload | null>(PREVIEW_EVENT, (e) => {
      placedFor.current = null;
      userMoved.current = false;
      setPayload(e.payload);
    });
    return () => { un.then((f) => f()); };
  }, []);

  useEffect(() => {
    if (!payload) return;
    const key = `${payload.content.slice(0, 40)}:${payload.taskTop}:${payload.width}`;
    if (placedFor.current === key) return;
    placedFor.current = key;
    void placePreviewWindow(payload.width, payload.height, payload);
  }, [payload]);

  useEffect(() => {
    const win = getCurrentWindow();
    let un: (() => void) | undefined;
    void win.onFocusChanged(({ payload: focused }) => {
      void emit(PREVIEW_FOCUS, focused ? "focus" : "blur");
    }).then((fn) => { un = fn; });
    return () => un?.();
  }, []);

  useEffect(() => {
    const win = getCurrentWindow();
    let un: (() => void) | undefined;
    void win.onResized(async (ev) => {
      const scale = await win.scaleFactor();
      rememberPreviewSize(ev.payload.width / scale, ev.payload.height / scale);
    }).then((fn) => { un = fn; });
    return () => un?.();
  }, []);

  const hold = () => { void emit(PREVIEW_HOLD, "hold"); };
  const release = () => { void emit(PREVIEW_HOLD, "release"); };

  const onDragHeader = async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    hold();
    userMoved.current = true;
    try {
      await getCurrentWindow().startDragging();
    } catch { /* 无边框窗仍可用 data-tauri-drag-region */ }
  };

  const onResize = async (e: React.MouseEvent, dir: ResizeDir) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.button !== 0) return;
    hold();
    const win = getCurrentWindow();
    try {
      await (win as { startResizeDragging: (d: ResizeDir) => Promise<void> }).startResizeDragging(dir);
    } catch {
      await manualResize(win, dir, e.nativeEvent);
    }
  };

  if (!payload) return null;

  return (
    <div
      onMouseEnter={() => { void emit(PREVIEW_POINTER, "enter"); }}
      onMouseLeave={() => {
        if (!userMoved.current) void emit(PREVIEW_POINTER, "leave");
      }}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#FFFCF7",
        border: `1px solid ${payload.accentColor}55`,
      }}
    >
      <div
        data-tauri-drag-region
        onMouseDown={onDragHeader}
        onMouseUp={release}
        style={{
          padding: "7px 12px",
          background: `linear-gradient(135deg, ${payload.accentColor}22 0%, ${payload.accentColor}0a 100%)`,
          borderBottom: `1px solid ${payload.accentColor}24`,
          fontSize: 10,
          fontWeight: 700,
          color: payload.accentColor,
          letterSpacing: 0.5,
          flexShrink: 0,
          userSelect: "none",
          cursor: "grab",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <GripHorizontal size={13} style={{ opacity: 0.7, flexShrink: 0 }} />
        <span>PREVIEW</span>
        <span style={{ marginLeft: "auto", fontWeight: 500, opacity: 0.55, letterSpacing: 0 }}>
          拖动 · 拖边缩放
        </span>
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
          minHeight: 0,
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeHighlight]}
        >
          {payload.content}
        </ReactMarkdown>
      </div>

      <div
        style={{
          position: "absolute",
          right: 5,
          bottom: 5,
          width: 9,
          height: 9,
          borderRight: `2px solid ${payload.accentColor}99`,
          borderBottom: `2px solid ${payload.accentColor}99`,
          pointerEvents: "none",
        }}
      />
      <ResizeHandle dir="North" cursor="ns-resize" onResize={onResize} />
      <ResizeHandle dir="South" cursor="ns-resize" onResize={onResize} />
      <ResizeHandle dir="East" cursor="ew-resize" onResize={onResize} />
      <ResizeHandle dir="West" cursor="ew-resize" onResize={onResize} />
      <ResizeHandle dir="NorthEast" cursor="nesw-resize" onResize={onResize} />
      <ResizeHandle dir="NorthWest" cursor="nwse-resize" onResize={onResize} />
      <ResizeHandle dir="SouthEast" cursor="nwse-resize" onResize={onResize} />
      <ResizeHandle dir="SouthWest" cursor="nesw-resize" onResize={onResize} />
    </div>
  );
}

function ResizeHandle({
  dir, cursor, onResize,
}: {
  dir: ResizeDir;
  cursor: string;
  onResize: (e: React.MouseEvent, dir: ResizeDir) => void;
}) {
  const edge = 6;
  const corner = 12;
  const style: React.CSSProperties = {
    position: "absolute",
    zIndex: 4,
    cursor,
    ...(dir === "North" ? { top: 0, left: corner, right: corner, height: edge } : {}),
    ...(dir === "South" ? { bottom: 0, left: corner, right: corner, height: edge } : {}),
    ...(dir === "East" ? { top: corner, bottom: corner, right: 0, width: edge } : {}),
    ...(dir === "West" ? { top: corner, bottom: corner, left: 0, width: edge } : {}),
    ...(dir === "NorthEast" ? { top: 0, right: 0, width: corner, height: corner } : {}),
    ...(dir === "NorthWest" ? { top: 0, left: 0, width: corner, height: corner } : {}),
    ...(dir === "SouthEast" ? { bottom: 0, right: 0, width: corner, height: corner } : {}),
    ...(dir === "SouthWest" ? { bottom: 0, left: 0, width: corner, height: corner } : {}),
  };
  return (
    <div
      data-tauri-no-drag
      onMouseDown={(e) => onResize(e, dir)}
      style={style}
    />
  );
}

async function manualResize(
  win: ReturnType<typeof getCurrentWindow>,
  dir: ResizeDir,
  start: MouseEvent,
) {
  const [pos, size, scale] = await Promise.all([
    win.outerPosition(),
    win.outerSize(),
    win.scaleFactor(),
  ]);
  const origin = { x: start.screenX, y: start.screenY };
  const startX = pos.x / scale;
  const startY = pos.y / scale;
  const startW = size.width / scale;
  const startH = size.height / scale;

  const onMove = async (e: MouseEvent) => {
    const dx = (e.screenX - origin.x);
    const dy = (e.screenY - origin.y);
    let x = startX, y = startY, w = startW, h = startH;
    if (dir.includes("East")) w = startW + dx;
    if (dir.includes("West")) { w = startW - dx; x = startX + dx; }
    if (dir.includes("South")) h = startH + dy;
    if (dir.includes("North")) { h = startH - dy; y = startY + dy; }
    w = Math.max(260, w);
    h = Math.max(140, h);
    await win.setSize(new LogicalSize(w, h));
    if (dir.includes("West") || dir.includes("North")) {
      await win.setPosition(new LogicalPosition(x, y));
    }
    rememberPreviewSize(w, h);
  };
  const onUp = () => {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    void emit(PREVIEW_HOLD, "release");
  };
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

document.addEventListener("contextmenu", (e) => e.preventDefault());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <PreviewApp />,
);
