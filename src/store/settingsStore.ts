import { create } from "zustand";
import { Settings } from "../types";
import { storageGet, storageSet } from "../lib/storage";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { enable, disable } from "@tauri-apps/plugin-autostart";
import { register, unregister, isRegistered } from "@tauri-apps/plugin-global-shortcut";

interface SettingsState {
  settings: Settings;
  loaded: boolean;
  load: () => Promise<void>;
  setAlwaysOnTop: (value: boolean) => Promise<void>;
  setAutoStart: (value: boolean) => Promise<void>;
  setShortcutAddTask: (shortcut: string) => Promise<void>;
  setShortcutToggleWindow: (shortcut: string) => Promise<void>;
  setSyncEnabled: (enabled: boolean) => Promise<void>;
  setSyncFolderPath: (path: string) => Promise<void>;
  markSynced: () => Promise<void>;
  updateLastModified: () => Promise<void>;
  markAutoArchived: (yearMonth: string) => Promise<void>;
}

const DEFAULT_SETTINGS: Settings = {
  alwaysOnTop: false,
  autoStart: false,
  shortcutAddTask: "Ctrl+N",
  shortcutToggleWindow: "",
  syncEnabled: false,
  syncFolderPath: "",
  syncLastModifiedAt: null,
  syncLastSyncedAt: null,
  lastAutoArchiveMonth: null,
};

// 互斥锁：防止快捷键短时间内重复触发导致 hide→show 闪烁
let _toggling = false;

async function doToggleWindow() {
  if (_toggling) return;
  _toggling = true;
  try {
    const win = getCurrentWindow();
    const [visible, minimized] = await Promise.all([
      win.isVisible(),
      win.isMinimized(),
    ]);
    if (!visible || minimized) {
      // 隐藏 / 最小化状态 → 显示并聚焦
      await win.show();
      if (minimized) await win.unminimize();
      await win.setFocus();
    } else {
      await win.hide();
    }
  } finally {
    // 500 ms 内不再响应，避免系统/驱动层面的重复回调
    setTimeout(() => { _toggling = false; }, 500);
  }
}

async function registerToggleShortcut(shortcut: string) {
  if (!shortcut) return;
  try {
    const already = await isRegistered(shortcut);
    if (already) return;
    await register(shortcut, doToggleWindow);
  } catch (e) {
    console.warn("注册全局快捷键失败:", shortcut, e);
  }
}

async function unregisterShortcut(shortcut: string) {
  if (!shortcut) return;
  try {
    const already = await isRegistered(shortcut);
    if (already) await unregister(shortcut);
  } catch {}
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  load: async () => {
    const saved = await storageGet<Settings>("settings");
    const settings = { ...DEFAULT_SETTINGS, ...saved };

    try {
      if (settings.autoStart) await enable();
      else await disable();
    } catch {}

    if (settings.alwaysOnTop) {
      await getCurrentWindow().setAlwaysOnTop(true);
    }

    if (settings.shortcutToggleWindow) {
      await registerToggleShortcut(settings.shortcutToggleWindow);
    }

    set({ settings, loaded: true });
  },

  setAlwaysOnTop: async (value) => {
    await getCurrentWindow().setAlwaysOnTop(value);
    const settings = { ...get().settings, alwaysOnTop: value };
    set({ settings });
    await storageSet("settings", settings);
  },

  setAutoStart: async (value) => {
    try {
      if (value) await enable();
      else await disable();
    } catch {}
    const settings = { ...get().settings, autoStart: value };
    set({ settings });
    await storageSet("settings", settings);
  },

  setShortcutAddTask: async (shortcut) => {
    const settings = { ...get().settings, shortcutAddTask: shortcut };
    set({ settings });
    await storageSet("settings", settings);
  },

  setShortcutToggleWindow: async (shortcut) => {
    const old = get().settings.shortcutToggleWindow;
    await unregisterShortcut(old);
    if (shortcut) await registerToggleShortcut(shortcut);
    const settings = { ...get().settings, shortcutToggleWindow: shortcut };
    set({ settings });
    await storageSet("settings", settings);
  },

  setSyncEnabled: async (enabled) => {
    const settings = { ...get().settings, syncEnabled: enabled };
    set({ settings });
    await storageSet("settings", settings);
  },

  setSyncFolderPath: async (path) => {
    const settings = { ...get().settings, syncFolderPath: path };
    set({ settings });
    await storageSet("settings", settings);
  },

  markSynced: async () => {
    const now = new Date().toISOString();
    const settings = { ...get().settings, syncLastSyncedAt: now };
    set({ settings });
    await storageSet("settings", settings);
  },

  updateLastModified: async () => {
    const now = new Date().toISOString();
    const settings = { ...get().settings, syncLastModifiedAt: now };
    set({ settings });
    await storageSet("settings", settings);
  },

  markAutoArchived: async (yearMonth) => {
    const settings = { ...get().settings, lastAutoArchiveMonth: yearMonth };
    set({ settings });
    await storageSet("settings", settings);
  },
}));
