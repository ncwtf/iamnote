import { getCurrentWindow } from "@tauri-apps/api/window";
import { Pin, Settings, Minus, X } from "lucide-react";
import { useSettingsStore } from "../../store/settingsStore";

interface TitleBarProps {
  onSettingsClick: () => void;
  groupColor: string;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export function TitleBar({ onSettingsClick, groupColor }: TitleBarProps) {
  const { settings, setAlwaysOnTop } = useSettingsStore();
  const win = getCurrentWindow();

  const rgb = hexToRgb(groupColor.startsWith("#") ? groupColor : "#f59e0b");

  return (
    <div
      data-tauri-drag-region
      className="flex items-center select-none flex-shrink-0"
      style={{
        height: 52,
        background: `linear-gradient(135deg, rgba(${rgb},1) 0%, rgba(${rgb},0.85) 100%)`,
        borderRadius: "12px 12px 0 0",
        padding: "0 12px",
        cursor: "grab",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      {/* Logo + 标题 —— pointer-events-none 让事件穿透给父层 drag-region */}
      <div className="flex items-center gap-2.5 flex-1 h-full pointer-events-none">
        <img
          src="/iamnote.png"
          alt="logo"
          draggable={false}
          style={{ width: 32, height: 32, borderRadius: 8, boxShadow: "0 2px 6px rgba(0,0,0,0.20)" }}
        />
        <span
          className="font-bold tracking-wide"
          style={{ fontSize: 16, color: "rgba(255,255,255,0.95)", textShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
        >
          iamnote
        </span>
      </div>

      {/* data-tauri-no-drag 告知 Tauri 此区域不参与拖动 */}
      <div
        data-tauri-no-drag
        className="flex items-center gap-0.5"
        style={{ cursor: "default" }}
      >
        <TitleButton
          onClick={() => setAlwaysOnTop(!settings.alwaysOnTop)}
          title={settings.alwaysOnTop ? "取消置顶" : "窗口置顶"}
          active={settings.alwaysOnTop}
        >
          <Pin size={15} />
        </TitleButton>
        <TitleButton onClick={onSettingsClick} title="设置">
          <Settings size={15} />
        </TitleButton>

        <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.25)", margin: "0 6px" }} />

        <TitleButton onClick={() => win.minimize()} title="最小化">
          <Minus size={15} />
        </TitleButton>
        <TitleButton onClick={() => win.close()} title="关闭" danger>
          <X size={15} />
        </TitleButton>
      </div>
    </div>
  );
}

function TitleButton({
  children,
  onClick,
  title,
  active,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: active ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.7)",
        background: active ? "rgba(255,255,255,0.25)" : "transparent",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = danger
          ? "rgba(239,68,68,0.75)"
          : "rgba(255,255,255,0.2)";
        (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = active
          ? "rgba(255,255,255,0.25)"
          : "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = active
          ? "rgba(255,255,255,1)"
          : "rgba(255,255,255,0.7)";
      }}
    >
      {children}
    </button>
  );
}
