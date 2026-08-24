import type { ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Pin, Minus, X } from "lucide-react";
import { useSettingsStore } from "../../store/settingsStore";
import { ui } from "../../theme";

export function TitleBar() {
  const { settings, setAlwaysOnTop } = useSettingsStore();
  const win = getCurrentWindow();

  return (
    <div
      data-tauri-drag-region
      className="flex items-center select-none flex-shrink-0"
      style={{
        height: 36,
        background: "transparent",
        padding: "0 10px 0 14px",
        cursor: "grab",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      <div className="flex-1 h-full pointer-events-none" />

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
          <Pin size={13} />
        </TitleButton>
        <TitleButton onClick={() => win.minimize()} title="最小化">
          <Minus size={13} />
        </TitleButton>
        <TitleButton onClick={() => win.hide()} title="关闭窗口（后台继续运行）" danger>
          <X size={13} />
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
  children: ReactNode;
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
        width: 28,
        height: 28,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: active ? ui.accent : ui.muted,
        background: active ? "rgba(59,130,246,0.12)" : "transparent",
        transition: "background 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = danger
          ? "#EF4444"
          : "rgba(23,23,23,0.06)";
        (e.currentTarget as HTMLButtonElement).style.color = danger ? "#fff" : ui.ink;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = active
          ? "rgba(59,130,246,0.12)"
          : "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = active ? ui.accent : ui.muted;
      }}
    >
      {children}
    </button>
  );
}
