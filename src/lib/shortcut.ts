/** 将浏览器 KeyboardEvent 转为快捷键字符串，如 "Ctrl+Shift+N" */
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
