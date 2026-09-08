import { isMac } from "./platform";

/** 将浏览器 KeyboardEvent 转为快捷键字符串，如 "Ctrl+Shift+N" / "Super+N" */
export function buildShortcutString(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Super");
  const modifiers = ["Control", "Alt", "Shift", "Meta"];
  if (!modifiers.includes(e.key)) {
    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    parts.push(key);
  }
  return parts.join("+");
}

/** 设置页展示：Mac 上 Super 显示为 ⌘ */
export function formatShortcut(shortcut: string): string {
  if (!shortcut) return "";
  if (!isMac) return shortcut.replaceAll("Super", "Win");
  return shortcut
    .replaceAll("Super", "⌘")
    .replaceAll("Ctrl", "⌃")
    .replaceAll("Alt", "⌥")
    .replaceAll("Shift", "⇧")
    .replaceAll("+", "");
}

/** 比较按键与已保存快捷键。Mac 上 Ctrl+N 与 ⌘N 视为同一默认组合。 */
export function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  if (!shortcut) return false;
  const actual = buildShortcutString(e);
  if (actual === shortcut) return true;
  if (!isMac) return false;
  const aliases = new Set([
    shortcut,
    shortcut.replaceAll("Ctrl+", "Super+"),
    shortcut.replaceAll("Super+", "Ctrl+"),
  ]);
  return aliases.has(actual);
}

/** 注册全局快捷键时，把 Super 转成插件认识的 Command */
export function toGlobalShortcut(shortcut: string): string {
  if (!shortcut) return shortcut;
  if (isMac) return shortcut.replaceAll("Super+", "Command+");
  return shortcut;
}
