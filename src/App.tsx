import { useEffect, useRef, useState } from "react";
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
import { FAVORITES_GROUP_ID, ARCHIVE_GROUP_ID, toYearMonth } from "./types";
import { buildShortcutString } from "./lib/shortcut";
import { writeSyncFile, resolveOnStartup } from "./lib/sync";

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
  const isArchive = activeGroupId === ARCHIVE_GROUP_ID;
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
        onSettingsClick={() => setShowSettings(true)}
        groupColor={
          isFavorites ? "#F59E0B" :
          isArchive   ? "#6B7280" :
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
    </div>
  );
}

export default App;
