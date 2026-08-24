import { useState, type ReactNode } from "react";
import { ui } from "../theme";

export function AppLogo({ size = 26 }: { size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 9,
          background: "linear-gradient(135deg, #A78BFA 0%, #6366F1 48%, #3B82F6 100%)",
          color: "#fff",
          fontWeight: 700,
          fontSize: size * 0.48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          letterSpacing: "-0.04em",
          flexShrink: 0,
        }}
      >
        n
      </div>
    );
  }
  return (
    <img
      src="/iamnote.png"
      alt="iamnote"
      draggable={false}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: 9, flexShrink: 0 }}
    />
  );
}

export function CountBadge({
  children,
  inverse,
}: {
  children: ReactNode;
  inverse?: boolean;
}) {
  return (
    <span
      style={{
        minWidth: 20,
        height: 20,
        padding: "0 6px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: inverse ? "rgba(255,255,255,0.92)" : ui.muted,
        background: inverse ? "rgba(255,255,255,0.22)" : "rgba(23,23,23,0.06)",
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

export function CircleIconBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: active ? ui.accent : ui.muted,
        background: active ? tintBlue(0.12) : ui.card,
        border: `1px solid ${active ? tintBlue(0.22) : ui.lineStrong}`,
        boxShadow: active ? "none" : "0 1px 2px rgba(23,23,23,0.04)",
        transition: "background 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "#F3F4F6";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = ui.card;
      }}
    >
      {children}
    </button>
  );
}

export function PrimaryBtn({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        height: 34,
        padding: "0 14px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        color: "#fff",
        background: ui.accentGrad,
        boxShadow: ui.accentShadow,
        transition: "filter 0.12s, transform 0.12s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.filter = "brightness(1.05)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.filter = "none";
      }}
    >
      {children}
    </button>
  );
}

export function PageHeader({
  title,
  count,
  leading,
  actions,
}: {
  title: string;
  count?: number;
  leading?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      data-tauri-drag-region
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "4px 22px 12px",
        flexShrink: 0,
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {leading}
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: ui.ink,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        {count != null && count > 0 && <CountBadge>{count}</CountBadge>}
      </div>
      {actions && (
        <div data-tauri-no-drag style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}

export function MetaPill({
  children,
  color,
  bg,
}: {
  children: ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        height: 20,
        padding: "0 7px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        color,
        background: bg,
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  );
}

function tintBlue(alpha: number) {
  return `rgba(37, 99, 235, ${alpha})`;
}

