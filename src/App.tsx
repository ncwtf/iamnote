import { useEffect, useRef, useState, useCallback } from "react";
import { useGroupStore } from "./store/groupStore";
import { useTaskStore } from "./store/taskStore";
import { useSettingsStore } from "./store/settingsStore";
import { useArchiveStore } from "./store/archiveStore";
import { TitleBar } from "./components/TitleBar/TitleBar";
import { GroupSidebar } from "./components/GroupSidebar/GroupSidebar";
import { TaskList } from "./components/TaskList/TaskList";
import { FavoritesView } from "./components/FavoritesView/FavoritesView";
import { ArchiveView } from "./components/ArchiveView/ArchiveView";
import { SettingsPanel } from "./components/SettingsPanel/SettingsPanel";
import { OverviewView } from "./components/OverviewView/OverviewView";
import { FAVORITES_GROUP_ID, ARCHIVE_GROUP_ID, OVERVIEW_GROUP_ID, toYearMonth } from "./types";
import { buildShortcutString } from "./lib/shortcut";
import { writeSyncFile, resolveOnStartup } from "./lib/sync";
import { invoke } from "@tauri-apps/api/core";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

function App() {
  const { load: loadGroups, groups, activeGroupId, replaceAll: replaceGroups } = useGroupStore();
  const { load: loadTasks, tasks, replaceAll: replaceTasks, deleteTask } = useTaskStore();
  const {
    load: loadSettings, settings,
    updateLastModified, markSynced, markAutoArchived,
  } = useSettingsStore();
  const { load: loadArchives, archiveTasks } = useArchiveStore();

  const [showSettings, setShowSettings] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // ── 定时提醒（系统通知 + 提示音 + 应用内 Toast） ─────────────
  const { updateTask } = useTaskStore();

  /** 用 ref 读取最新 tasks，让 interval 不依赖 tasks 变化 */
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  /** 已触发过的任务 ID，防止重复弹出 */
  const firedIdsRef = useRef<Set<string>>(new Set());

  /** 应用内 Toast 列表（系统通知的可视兜底） */
  const [reminderToasts, setReminderToasts] = useState<{ id: string; title: string }[]>([]);

  /** 播放简短提示音（滴~滴~） */
  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const beep = (delay: number) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.35, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.35);
      };
      beep(0);
      beep(0.45);
    } catch {
      // AudioContext 不可用时静默忽略
    }
  }, []);

  /** 发送系统通知 */
  const sendOsNotification = useCallback(async (title: string, body: string) => {
    try {
      let granted = await isPermissionGranted();
      if (!granted) {
        const perm = await requestPermission();
        granted = perm === "granted";
      }
      if (granted) sendNotification({ title, body });
    } catch (e) {
      console.warn("[提醒] 系统通知发送失败:", e);
    }
  }, []);

  /**
   * 定时轮询 — 只挂载一次（空依赖），通过 tasksRef 读取最新数据。
   * 这样 tasks 变化时不会重置 interval，确保计时器稳定运行。
   */
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      const due = tasksRef.current.filter(
        (t) =>
          t.reminderAt &&
          !t.reminderFired &&
          !firedIdsRef.current.has(t.id) &&
          new Date(t.reminderAt).getTime() <= now
      );
      if (due.length === 0) return;

      // 立即写入 ref（store 更新是异步的，ref 立刻阻止重复触发）
      due.forEach((t) => firedIdsRef.current.add(t.id));
      due.forEach((t) => updateTask(t.id, { reminderFired: true }));

      // 声音 + 系统通知 + 应用内 Toast
      playBeep();
      due.forEach((t) => sendOsNotification("⏰ 任务提醒", t.title));
      setReminderToasts((prev) => [
        ...prev,
        ...due.map((t) => ({ id: t.id + "_" + Date.now(), title: t.title })),
      ]);
    };

    check(); // 应用加载时立即检查一次（处理错过的提醒）
    const interval = setInterval(check, 15_000); // 每 15 秒检查
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← 空依赖，interval 永不重置

  // F12 隐藏快捷键：打开 DevTools 控制台
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault(); // 屏蔽 F12
      }
      if (e.ctrlKey && e.altKey && e.code === "KeyL") {
        e.preventDefault();
        invoke("open_devtools").catch(() => {});
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("sidebar-width");
    return saved ? parseInt(saved) : 180;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const addTaskTriggerRef = useRef<(() => void) | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingFromCloud = useRef(false);

  // ── 初始化 ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      await loadSettings();
      await loadGroups();
      await loadTasks();
      await loadArchives();
    })();
  }, []);

  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const groupsLoaded = useGroupStore((s) => s.loaded);
  const tasksLoaded = useTaskStore((s) => s.loaded);

  // ── 启动时：云端同步 + 自动归档 ─────────────────────────
  useEffect(() => {
    if (!settingsLoaded || !groupsLoaded || !tasksLoaded) return;

    (async () => {
      // 1. 云端同步
      if (settings.syncEnabled && settings.syncFolderPath) {
        isLoadingFromCloud.current = true;
        try {
          const result = await resolveOnStartup(
            settings.syncFolderPath,
            settings.syncLastModifiedAt,
            groups,
            tasks
          );
          if (result.fromCloud) {
            await replaceGroups(result.groups);
            await replaceTasks(result.tasks);
            await markSynced();
          } else {
            await markSynced();
          }
        } catch (e) {
          console.warn("启动同步失败:", e);
        } finally {
          isLoadingFromCloud.current = false;
        }
      }

      // 2. 自动归档：每月1日，且本月尚未自动归档
      const today = new Date();
      const currentYM = toYearMonth(today);
      if (
        today.getDate() === 1 &&
        settings.lastAutoArchiveMonth !== currentYM
      ) {
        // 归档到上个月
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const targetYM = toYearMonth(prevMonth);
        const currentDone = useTaskStore.getState().tasks.filter((t) => t.status === "done");
        if (currentDone.length > 0) {
          const archivedIds = await archiveTasks(
            currentDone,
            useGroupStore.getState().groups,
            targetYM
          );
          // 从任务列表移除已归档任务
          for (const id of archivedIds) deleteTask(id);
        }
        await markAutoArchived(currentYM);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, groupsLoaded, tasksLoaded]);

  // ── 数据变化时自动同步（防抖 2s） ───────────────────────
  useEffect(() => {
    if (!settingsLoaded || !groupsLoaded || !tasksLoaded) return;
    if (!settings.syncEnabled || !settings.syncFolderPath) return;
    if (isLoadingFromCloud.current) return;
    updateLastModified();
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      try {
        await writeSyncFile(settings.syncFolderPath, groups, tasks);
        await markSynced();
      } catch (e) {
        console.warn("自动同步失败:", e);
      }
    }, 2000);
    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, tasks]);

  // ── 本地快捷键 ──────────────────────────────────────────
  useEffect(() => {
    if (!settings.shortcutAddTask) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (buildShortcutString(e) === settings.shortcutAddTask) {
        e.preventDefault();
        addTaskTriggerRef.current?.();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [settings.shortcutAddTask]);

  // ── 手动归档 ────────────────────────────────────────────
  const handleArchiveNow = async () => {
    setArchiving(true);
    try {
      const currentDone = tasks.filter((t) => t.status === "done");
      if (currentDone.length === 0) return;
      const targetYM = toYearMonth(new Date());
      const archivedIds = await archiveTasks(currentDone, groups, targetYM);
      for (const id of archivedIds) deleteTask(id);
    } finally {
      setArchiving(false);
    }
  };

  const handleWidthChange = (w: number) => {
    setSidebarWidth(w);
    localStorage.setItem("sidebar-width", String(w));
  };

  const handleCollapsedChange = (c: boolean) => {
    setSidebarCollapsed(c);
    localStorage.setItem("sidebar-collapsed", String(c));
  };

  const isFavorites = activeGroupId === FAVORITES_GROUP_ID;
  const isArchive   = activeGroupId === ARCHIVE_GROUP_ID;
  const isOverview  = activeGroupId === OVERVIEW_GROUP_ID;
  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const accentColor = activeGroup?.color ?? "#f59e0b";

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col"
      style={{
        borderRadius: 12,
        boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
        background: "#FAFAF8",
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <TitleBar
        onSettingsClick={() => setShowSettings((v) => !v)}
        groupColor={
          isFavorites ? "#F59E0B" :
          isArchive   ? "#6B7280" :
          isOverview  ? "#10B981" :
          accentColor
        }
      />

      <div className="flex flex-1 overflow-hidden relative">
        <GroupSidebar
          width={sidebarWidth}
          onWidthChange={handleWidthChange}
          collapsed={sidebarCollapsed}
          onCollapsedChange={handleCollapsedChange}
        />

        {isFavorites ? (
          <FavoritesView />
        ) : isArchive ? (
          <ArchiveView onArchiveNow={handleArchiveNow} archiving={archiving} />
        ) : isOverview ? (
          <OverviewView />
        ) : activeGroup ? (
          <TaskList group={activeGroup} addTriggerRef={addTaskTriggerRef} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-400">请选择或创建一个分组</p>
          </div>
        )}

        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}
      </div>

      {/* ── 应用内提醒 Toast（系统通知的可视兜底） ── */}
      {reminderToasts.length > 0 && (
        <div style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 99999,
          display: "flex", flexDirection: "column", gap: 8,
          pointerEvents: "none",
        }}>
          {reminderToasts.map((toast) => (
            <div
              key={toast.id}
              style={{
                background: "#fff", borderRadius: 12,
                boxShadow: "0 6px 24px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)",
                border: "1.5px solid #F59E0B50",
                padding: "12px 14px 12px 12px",
                minWidth: 240, maxWidth: 300,
                display: "flex", alignItems: "flex-start", gap: 10,
                pointerEvents: "auto",
                animation: "slideInRight 0.25s ease",
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>⏰</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#F59E0B", marginBottom: 2, letterSpacing: 0.3 }}>
                  任务提醒
                </div>
                <div style={{ fontSize: 13, color: "#1c1c1e", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {toast.title}
                </div>
              </div>
              <button
                onClick={() => setReminderToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                style={{ fontSize: 18, color: "#C4C4C4", lineHeight: 1, flexShrink: 0, paddingTop: 0 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#6B7280"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#C4C4C4"; }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
