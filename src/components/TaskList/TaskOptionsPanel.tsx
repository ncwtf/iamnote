import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, GripHorizontal, RotateCcw, Bell, CalendarClock } from "lucide-react";
import { Task } from "../../types";
import { useTaskStore } from "../../store/taskStore";

const PANEL_W = 300;

interface TaskOptionsPanelProps {
  task: Task;
  anchorRect: DOMRect;
  onClose: () => void;
}

export function TaskOptionsPanel({ task, anchorRect, onClose }: TaskOptionsPanelProps) {
  const { updateTask } = useTaskStore();
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const dragging = useRef(false);
  const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // 初始定位
  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = anchorRect.right + 8;
    let y = anchorRect.top - 8;
    if (x + PANEL_W > vw - 10) x = anchorRect.left - PANEL_W - 8;
    if (x < 10) x = Math.max(10, (vw - PANEL_W) / 2);
    if (y + 280 > vh - 10) y = vh - 280 - 10;
    if (y < 10) y = 10;
    setPos({ x, y });
    setReady(true);
  }, [anchorRect]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  // Esc 关闭
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [handleClose]);

  // 点击外部关闭
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) handleClose();
    };
    const t = setTimeout(() => window.addEventListener("mousedown", h), 150);
    return () => { clearTimeout(t); window.removeEventListener("mousedown", h); };
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

  // ── 各个配置项的 setter ──
  const set = (patch: Partial<Task>) => updateTask(task.id, patch);

  const toggleRecurring = () => {
    set({ recurringEnabled: !task.recurringEnabled });
  };

  const togglePeriodic = () => {
    if (!task.periodicEnabled) {
      // 开启周期循环时自动开启循环计数
      set({ periodicEnabled: true, recurringEnabled: true });
    } else {
      set({ periodicEnabled: false });
    }
  };

  const clearReminder = () => set({ reminderAt: null, reminderFired: false });

  const periodicLabel: Record<Task["periodicType"], string> = {
    daily: "天", weekly: "周", monthly: "月", yearly: "年",
  };

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed", left: pos.x, top: pos.y, width: PANEL_W,
        zIndex: 9999, borderRadius: 12,
        boxShadow: "0 8px 30px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)",
        border: "1.5px solid rgba(0,0,0,0.08)",
        background: "#fff", overflow: "hidden",
      }}
    >
      {/* 标题栏 */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{
          padding: "9px 12px", background: "#FAFAFA",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          display: "flex", alignItems: "center", gap: 8,
          cursor: "grab", userSelect: "none",
        }}
      >
        <GripHorizontal size={13} style={{ color: "#C4C4C4", flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          任务选项 · {task.title}
        </span>
        <button onClick={handleClose} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 5, color: "#9CA3AF" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#FEE2E2"; (e.currentTarget as HTMLElement).style.color = "#EF4444"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#9CA3AF"; }}>
          <X size={13} />
        </button>
      </div>

      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* ── 循环计数 ── */}
        <OptionRow
          icon={<RotateCcw size={15} color="#3B82F6" />}
          label="循环计数"
          desc={task.recurringEnabled
            ? `每次完成 +1，当前已完成 ${task.recurringCount} 次`
            : "开启后，完成不归档，完成次数累计"}
          checked={task.recurringEnabled}
          onToggle={toggleRecurring}
          color="#3B82F6"
        />
        {task.recurringEnabled && task.recurringCount > 0 && (
          <div style={{ paddingLeft: 28 }}>
            <button
              onClick={() => set({ recurringCount: 0 })}
              style={{ fontSize: 11, color: "#9CA3AF", textDecoration: "underline" }}
            >
              重置计数
            </button>
          </div>
        )}

        {/* ── 定时提醒 ── */}
        <OptionRow
          icon={<Bell size={15} color="#F59E0B" />}
          label="定时提醒"
          desc={task.reminderAt
            ? `提醒时间：${fmtDatetime(task.reminderAt)}${task.reminderFired ? "（已触发）" : ""}`
            : "设置后在指定时间弹出提示"}
          checked={!!task.reminderAt}
          onToggle={() => {
            if (task.reminderAt) clearReminder();
          }}
          color="#F59E0B"
          noToggle={!task.reminderAt}
        />
        <div style={{ paddingLeft: 28, marginTop: -8 }}>
          <input
            type="datetime-local"
            value={task.reminderAt ? task.reminderAt.slice(0, 16) : ""}
            onChange={(e) => {
              const v = e.target.value;
              set({ reminderAt: v ? new Date(v).toISOString() : null, reminderFired: false });
            }}
            style={{
              fontSize: 12, color: "#374151", border: "1px solid #E5E7EB",
              borderRadius: 6, padding: "4px 8px", background: "#FAFAFA", width: "100%",
            }}
          />
          {task.reminderAt && (
            <button onClick={clearReminder} style={{ fontSize: 11, color: "#9CA3AF", textDecoration: "underline", marginTop: 4 }}>
              清除提醒
            </button>
          )}
        </div>

        {/* ── 周期循环 ── */}
        <OptionRow
          icon={<CalendarClock size={15} color="#8B5CF6" />}
          label="周期循环"
          desc={task.periodicEnabled
            ? `完成后在下个周期自动复原${task.nextDueAt ? "，下次：" + fmtDatetime(task.nextDueAt) : ""}`
            : "完成后自动计算下次到期时间并重置"}
          checked={task.periodicEnabled}
          onToggle={togglePeriodic}
          color="#8B5CF6"
        />
        {task.periodicEnabled && (
          <div style={{ paddingLeft: 28, marginTop: -8, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#6B7280" }}>每</span>
            <input
              type="number" min={1} max={99}
              value={task.periodicInterval}
              onChange={(e) => set({ periodicInterval: Math.max(1, parseInt(e.target.value) || 1) })}
              style={{ width: 48, fontSize: 12, border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 6px", textAlign: "center" }}
            />
            <select
              value={task.periodicType}
              onChange={(e) => set({ periodicType: e.target.value as Task["periodicType"] })}
              style={{ fontSize: 12, border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 6px", background: "#FAFAFA" }}
            >
              {(Object.keys(periodicLabel) as Task["periodicType"][]).map((k) => (
                <option key={k} value={k}>{periodicLabel[k]}</option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: "#6B7280" }}>循环一次</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ── 工具 ──────────────────────────────────────────────────
function fmtDatetime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function OptionRow({ icon, label, desc, checked, onToggle, color, noToggle }: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  checked: boolean;
  onToggle: () => void;
  color: string;
  noToggle?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <div style={{ paddingTop: 2, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1c1c1e" }}>{label}</div>
        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1, lineHeight: 1.5 }}>{desc}</div>
      </div>
      {!noToggle && (
        <button
          onClick={onToggle}
          style={{
            flexShrink: 0, width: 34, height: 20, borderRadius: 10,
            background: checked ? color : "#E5E7EB",
            position: "relative", transition: "background 0.2s",
          }}
        >
          <span style={{
            position: "absolute", top: 3, left: checked ? 17 : 3,
            width: 14, height: 14, borderRadius: "50%", background: "#fff",
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }} />
        </button>
      )}
    </div>
  );
}
