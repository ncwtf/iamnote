export const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

if (typeof document !== "undefined" && isMac) {
  document.documentElement.classList.add("is-mac");
}
