import { useEffect } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ui } from "../theme";
import type { UpdateInfo } from "../lib/githubUpdate";

export function UpdateDialog({
  info,
  onLater,
}: {
  info: UpdateInfo;
  onLater: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onLater();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onLater]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 12000,
        background: "rgba(23,23,23,0.28)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "min(420px, 100%)",
          background: ui.surface,
          borderRadius: 16,
          boxShadow: ui.shadowSoft,
          border: `1px solid ${ui.line}`,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "18px 20px 12px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: ui.accent, letterSpacing: 0.4 }}>
            发现新版本
          </p>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: ui.ink, marginTop: 6 }}>
            iamnote v{info.version}
          </h3>
          {info.notes ? (
            <pre
              style={{
                marginTop: 12,
                maxHeight: 180,
                overflow: "auto",
                fontSize: 12,
                lineHeight: 1.6,
                color: ui.inkSoft,
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
              }}
            >
              {info.notes}
            </pre>
          ) : (
            <p style={{ marginTop: 10, fontSize: 13, color: ui.muted }}>
              可从 GitHub Releases 下载安装包。
            </p>
          )}
          <p style={{ marginTop: 10, fontSize: 11, color: ui.faint, lineHeight: 1.5 }}>
            将在浏览器中打开对应平台的安装包，安装后覆盖即可。
          </p>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px 16px",
          }}
        >
          <button
            onClick={() => { void openUrl(info.pageUrl); }}
            style={{
              marginRight: "auto",
              height: 32,
              padding: "0 8px",
              borderRadius: 8,
              fontSize: 12,
              color: ui.muted,
              background: "transparent",
            }}
          >
            发布页
          </button>
          <button
            onClick={onLater}
            style={{
              height: 32,
              padding: "0 12px",
              borderRadius: 8,
              fontSize: 13,
              color: ui.inkSoft,
              background: ui.paperDeep,
            }}
          >
            稍后
          </button>
          <button
            onClick={() => { void openUrl(info.downloadUrl); }}
            style={{
              height: 32,
              padding: "0 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              background: ui.accent,
            }}
          >
            立即更新
          </button>
        </div>
      </div>
    </div>
  );
}
