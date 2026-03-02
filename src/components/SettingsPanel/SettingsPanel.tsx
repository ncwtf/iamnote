import { useEffect, useState } from "react";
import { X, Pin, Power, Keyboard, Eye, Download, Upload, CheckCircle, AlertCircle, Cloud, FolderOpen, RefreshCw } from "lucide-react";
import { useSettingsStore } from "../../store/settingsStore";
import { useGroupStore } from "../../store/groupStore";
import { useTaskStore } from "../../store/taskStore";
import { buildShortcutString } from "../../lib/shortcut";
import { exportBackup, importBackup } from "../../lib/importExport";
import { pickSyncFolder, writeSyncFile } from "../../lib/sync";

interface SettingsPanelProps {
  onClose: () => void;
}

// ─── Toggle 开关 ────────────────────────────────────────────
function Toggle({ checked, onChange, color = "#3B82F6" }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        backgroundColor: checked ? color : "#E5E7EB",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 2,
        left: checked ? 22 : 2,
        width: 20, height: 20, borderRadius: "50%",
        backgroundColor: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

// ─── 快捷键录制器 ────────────────────────────────────────────
function ShortcutRecorder({ value, onChange, placeholder = "点击设置快捷键" }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState("");

  useEffect(() => {
    if (!recording) return;

    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setRecording(false);
        setPending("");
        return;
      }

      const shortcut = buildShortcutString(e);
      const modifiers = ["Ctrl", "Alt", "Shift", "Super"];
      const parts = shortcut.split("+");
      const hasNonModifier = parts.some((p) => !modifiers.includes(p));

      if (hasNonModifier && parts.length >= 2) {
        // 至少一个修饰键 + 一个非修饰键
        setPending(shortcut);
        onChange(shortcut);
        setRecording(false);
      } else {
        // 只有修饰键，继续等待
        setPending(parts.filter((p) => modifiers.includes(p)).join("+") + " + ...");
      }
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [recording, onChange]);

  const display = recording ? (pending || "请按快捷键...") : (value || placeholder);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={() => { setRecording(true); setPending(""); }}
        style={{
          minWidth: 140, padding: "5px 12px",
          borderRadius: 8,
          border: recording
            ? "1.5px solid #3B82F6"
            : "1.5px solid #E5E7EB",
          background: recording ? "#EFF6FF" : "#F9FAFB",
          color: recording ? "#2563EB" : value ? "#1c1c1e" : "#9CA3AF",
          fontSize: 13, fontWeight: 500,
          textAlign: "left",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        {display}
      </button>
      {value && !recording && (
        <button
          onClick={() => onChange("")}
          title="清除"
          style={{
            width: 26, height: 26, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#9CA3AF", fontSize: 14, flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#FEE2E2";
            (e.currentTarget as HTMLElement).style.color = "#EF4444";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#9CA3AF";
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ─── 普通开关行 ─────────────────────────────────────────────
function ToggleRow({ icon, label, desc, checked, onChange, color }: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 0", borderBottom: "1px solid rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "#F3F4F6", display: "flex", alignItems: "center",
          justifyContent: "center", color: "#555", flexShrink: 0, marginTop: 1,
        }}>
          {icon}
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1c1c1e" }}>{label}</p>
          <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{desc}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} color={color} />
    </div>
  );
}

// ─── 快捷键行 ───────────────────────────────────────────────
function ShortcutRow({ icon, label, desc, value, onChange }: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 0", borderBottom: "1px solid rgba(0,0,0,0.06)",
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "#F3F4F6", display: "flex", alignItems: "center",
          justifyContent: "center", color: "#555", flexShrink: 0, marginTop: 1,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1c1c1e" }}>{label}</p>
          <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{desc}</p>
        </div>
      </div>
      <ShortcutRecorder value={value} onChange={onChange} />
    </div>
  );
}

// ─── 分区标题 ────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, color: "#9CA3AF",
      textTransform: "uppercase", letterSpacing: "0.08em",
      padding: "16px 0 4px",
    }}>
      {children}
    </p>
  );
}

// ─── 导入导出按钮 ─────────────────────────────────────────────
type IOStatus = { type: "success" | "error"; msg: string } | null;

function ImportExportSection() {
  const { groups } = useGroupStore();
  const { tasks, replaceAll: replaceTasks } = useTaskStore();
  const { replaceAll: replaceGroups } = useGroupStore();
  const [status, setStatus] = useState<IOStatus>(null);
  const [busy, setBusy] = useState(false);

  const showStatus = (type: "success" | "error", msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 4000);
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const path = await exportBackup(groups, tasks);
      if (path) showStatus("success", `已导出到 ${path}`);
    } catch (e) {
      showStatus("error", `导出失败：${e}`);
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    setBusy(true);
    try {
      const data = await importBackup();
      if (!data) { setBusy(false); return; }

      const confirmed = window.confirm(
        `即将导入 ${data.groups.length} 个分组、${data.tasks.length} 个任务。\n` +
        `当前数据将被完全替换，是否继续？`
      );
      if (!confirmed) { setBusy(false); return; }

      await replaceGroups(data.groups);
      await replaceTasks(data.tasks);
      showStatus("success", `已导入 ${data.groups.length} 个分组、${data.tasks.length} 个任务`);
    } catch (e) {
      showStatus("error", `导入失败：${String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        {/* 导出 */}
        <button
          onClick={handleExport}
          disabled={busy}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            padding: "9px 0", borderRadius: 10,
            background: "#EFF6FF", color: "#2563EB",
            fontSize: 13, fontWeight: 600,
            border: "1px solid #BFDBFE",
            opacity: busy ? 0.6 : 1,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => { if (!busy) (e.currentTarget as HTMLElement).style.background = "#DBEAFE"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#EFF6FF"; }}
        >
          <Download size={14} />
          导出备份
        </button>

        {/* 导入 */}
        <button
          onClick={handleImport}
          disabled={busy}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            padding: "9px 0", borderRadius: 10,
            background: "#F0FDF4", color: "#16A34A",
            fontSize: 13, fontWeight: 600,
            border: "1px solid #BBF7D0",
            opacity: busy ? 0.6 : 1,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => { if (!busy) (e.currentTarget as HTMLElement).style.background = "#DCFCE7"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#F0FDF4"; }}
        >
          <Upload size={14} />
          导入备份
        </button>
      </div>

      {/* 状态提示 */}
      {status && (
        <div style={{
          marginTop: 10, padding: "8px 12px",
          borderRadius: 8, fontSize: 12, lineHeight: 1.5,
          display: "flex", alignItems: "flex-start", gap: 8,
          background: status.type === "success" ? "#F0FDF4" : "#FEF2F2",
          border: `1px solid ${status.type === "success" ? "#BBF7D0" : "#FECACA"}`,
          color: status.type === "success" ? "#15803D" : "#B91C1C",
        }}>
          {status.type === "success"
            ? <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            : <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          }
          <span>{status.msg}</span>
        </div>
      )}

      <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8, lineHeight: 1.5 }}>
        备份为 JSON 格式，包含全部分组和任务数据。导入时将完全替换当前数据。
      </p>
    </div>
  );
}

// ─── 云端同步区块 ──────────────────────────────────────────────
function SyncSection() {
  const { settings, setSyncEnabled, setSyncFolderPath, markSynced } = useSettingsStore();
  const { groups } = useGroupStore();
  const { tasks } = useTaskStore();
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showStatus = (type: "success" | "error", msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 4000);
  };

  const handlePickFolder = async () => {
    const path = await pickSyncFolder();
    if (!path) return;
    await setSyncFolderPath(path);
    if (settings.syncEnabled) {
      try {
        await writeSyncFile(path, groups, tasks);
        await markSynced();
        showStatus("success", "同步文件夹已更新并完成首次同步");
      } catch (e) {
        showStatus("error", `同步失败：${e}`);
      }
    }
  };

  const handleManualSync = async () => {
    if (!settings.syncFolderPath) return;
    setSyncing(true);
    try {
      await writeSyncFile(settings.syncFolderPath, groups, tasks);
      await markSynced();
      showStatus("success", "同步完成");
    } catch (e) {
      showStatus("error", `同步失败：${e}`);
    } finally {
      setSyncing(false);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "从未";
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div>
      {/* 启用开关 */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", flexShrink: 0 }}>
            <Cloud size={16} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#1c1c1e" }}>启用文件夹同步</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>通过网盘客户端实现多端同步</p>
          </div>
        </div>
        <Toggle checked={settings.syncEnabled} onChange={setSyncEnabled} color="#8B5CF6" />
      </div>

      {/* 同步文件夹（启用后才显示） */}
      {settings.syncEnabled && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* 文件夹路径 */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px",
            background: "#F9FAFB", borderRadius: 8,
            border: "1px solid #E5E7EB",
          }}>
            <FolderOpen size={14} color="#9CA3AF" style={{ flexShrink: 0 }} />
            <span style={{
              flex: 1, fontSize: 12, color: settings.syncFolderPath ? "#374151" : "#9CA3AF",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {settings.syncFolderPath || "未选择同步文件夹"}
            </span>
            <button
              onClick={handlePickFolder}
              style={{
                fontSize: 12, fontWeight: 600, color: "#8B5CF6",
                flexShrink: 0, padding: "2px 8px", borderRadius: 5,
                background: "#F5F3FF", border: "1px solid #DDD6FE",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#EDE9FE"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#F5F3FF"; }}
            >
              更改
            </button>
          </div>

          {/* 状态行 */}
          {settings.syncFolderPath && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                上次同步：{formatTime(settings.syncLastSyncedAt)}
              </span>
              <button
                onClick={handleManualSync}
                disabled={syncing}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: 12, fontWeight: 600,
                  color: "#8B5CF6", padding: "4px 10px",
                  borderRadius: 6, background: "#F5F3FF",
                  border: "1px solid #DDD6FE",
                  opacity: syncing ? 0.6 : 1,
                }}
                onMouseEnter={(e) => { if (!syncing) (e.currentTarget as HTMLElement).style.background = "#EDE9FE"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#F5F3FF"; }}
              >
                <RefreshCw size={12} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
                {syncing ? "同步中..." : "立即同步"}
              </button>
            </div>
          )}

          {/* 状态提示 */}
          {status && (
            <div style={{
              padding: "7px 12px", borderRadius: 8, fontSize: 12,
              display: "flex", alignItems: "flex-start", gap: 8,
              background: status.type === "success" ? "#F0FDF4" : "#FEF2F2",
              border: `1px solid ${status.type === "success" ? "#BBF7D0" : "#FECACA"}`,
              color: status.type === "success" ? "#15803D" : "#B91C1C",
            }}>
              {status.type === "success"
                ? <CheckCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                : <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />}
              <span>{status.msg}</span>
            </div>
          )}

          {/* 使用说明 */}
          <div style={{ padding: "10px 12px", background: "#F5F3FF", borderRadius: 8, border: "1px solid #DDD6FE" }}>
            <p style={{ fontSize: 12, color: "#7C3AED", lineHeight: 1.7, fontWeight: 500, marginBottom: 4 }}>
              使用步骤
            </p>
            <p style={{ fontSize: 11, color: "#6D28D9", lineHeight: 1.7 }}>
              1. 安装网盘桌面客户端（Google Drive / OneDrive / Dropbox 等）<br />
              2. 在网盘同步目录内新建 <code style={{ background: "#EDE9FE", borderRadius: 3, padding: "0 4px" }}>iamnote</code> 文件夹<br />
              3. 点击「更改」选择该文件夹<br />
              4. 数据将自动写入 <code style={{ background: "#EDE9FE", borderRadius: 3, padding: "0 4px" }}>iamnote-data.json</code> 并由网盘同步到云端<br />
              5. 其他设备安装 iamnote 后选择同一文件夹即可同步
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 主面板 ─────────────────────────────────────────────────
export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const {
    settings,
    setAlwaysOnTop, setAutoStart,
    setShortcutAddTask, setShortcutToggleWindow,
  } = useSettingsStore();

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 50,
      background: "#FAFAF8",
      borderRadius: 12,
      display: "flex", flexDirection: "column",
    }}>
      {/* 头部 */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        background: "#fff",
        borderRadius: "12px 12px 0 0",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#1c1c1e" }}>设置</span>
        <button
          onClick={onClose}
          style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.06)"; (e.currentTarget as HTMLElement).style.color = "#333"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#999"; }}
        >
          <X size={15} />
        </button>
      </div>

      {/* 内容 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
        {/* 通用 */}
        <SectionTitle>通用</SectionTitle>
        <ToggleRow
          icon={<Pin size={16} />}
          label="窗口始终置顶"
          desc="始终显示在其他窗口前面"
          checked={settings.alwaysOnTop}
          onChange={setAlwaysOnTop}
          color="#3B82F6"
        />
        <ToggleRow
          icon={<Power size={16} />}
          label="开机自动启动"
          desc="登录系统时自动启动 iamnote"
          checked={settings.autoStart}
          onChange={setAutoStart}
          color="#10B981"
        />

        {/* 快捷键 */}
        <SectionTitle>快捷键</SectionTitle>
        <ShortcutRow
          icon={<Keyboard size={16} />}
          label="添加任务"
          desc="在当前分组快速新建任务（应用内）"
          value={settings.shortcutAddTask}
          onChange={setShortcutAddTask}
        />
        <ShortcutRow
          icon={<Eye size={16} />}
          label="显示 / 隐藏窗口"
          desc="全局快捷键，任何时候均可触发"
          value={settings.shortcutToggleWindow}
          onChange={setShortcutToggleWindow}
        />

        {/* 说明 */}
        <div style={{
          marginTop: 12, padding: "10px 14px",
          background: "#F0F9FF", borderRadius: 8,
          border: "1px solid #BAE6FD",
        }}>
          <p style={{ fontSize: 12, color: "#0369A1", lineHeight: 1.6 }}>
            💡 点击快捷键框后按下组合键即可录制。
            需要至少一个修饰键（Ctrl / Alt / Shift）。
            按 Esc 取消录制。
          </p>
        </div>

        {/* 数据管理 */}
        <SectionTitle>数据管理</SectionTitle>
        <ImportExportSection />

        {/* 云端同步 */}
        <SectionTitle>云端同步</SectionTitle>
        <SyncSection />
      </div>

      {/* 底部版本 & 作者 */}
      <div style={{ padding: "14px 20px 18px", textAlign: "center", flexShrink: 0, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#6B7280", marginBottom: 4 }}>iamnote v0.1.2</p>
        <p style={{ fontSize: 11, color: "#C4C4C4", lineHeight: 1.7 }}>
          Made with ♥ by <span style={{ color: "#9CA3AF", fontWeight: 500 }}>Hunter</span>
        </p>
        <p style={{ fontSize: 11, color: "#D1D5DB", marginTop: 2 }}>
          I AM NOTE is a simple and powerful task management tool.
        </p>
      </div>
    </div>
  );
}
