import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export const PREVIEW_LABEL = "hover-preview";
export const PREVIEW_EVENT = "hover-preview-update";
export const PREVIEW_POINTER = "hover-preview-pointer";
export const PREVIEW_HOLD = "hover-preview-hold";
export const PREVIEW_FOCUS = "hover-preview-focus";

const GAP = 12;
const MARGIN = 8;
const MIN_W = 260;
const MIN_H = 140;
const MAX_W = 720;
const MAX_H = 900;

export type HoverPreviewPayload = {
  content: string;
  accentColor: string;
  width: number;
  height: number;
  taskTop: number;
  taskBottom: number;
  mainLeft: number;
  mainTop: number;
  mainRight: number;
  mainBottom: number;
};

export type ScreenBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

let rememberedSize: { w: number; h: number } | null = null;

export function rememberPreviewSize(w: number, h: number) {
  rememberedSize = {
    w: Math.min(MAX_W, Math.max(MIN_W, Math.round(w))),
    h: Math.min(MAX_H, Math.max(MIN_H, Math.round(h))),
  };
}

export function getRememberedPreviewSize() {
  return rememberedSize;
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function ensureWindow(): Promise<WebviewWindow> {
  const existing = await WebviewWindow.getByLabel(PREVIEW_LABEL);
  if (existing) return existing;

  const win = new WebviewWindow(PREVIEW_LABEL, {
    url: "preview.html",
    title: "",
    width: 320,
    height: 220,
    minWidth: MIN_W,
    minHeight: MIN_H,
    maxWidth: MAX_W,
    maxHeight: MAX_H,
    decorations: false,
    transparent: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    focus: false,
    visible: false,
    resizable: true,
    shadow: false,
    x: -20000,
    y: -20000,
  });

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("preview window timeout")), 4000);
    win.once("tauri://created", () => { clearTimeout(t); resolve(); });
    win.once("tauri://error", (e) => { clearTimeout(t); reject(e); });
  });
  return win;
}

export async function showHoverPreviewWindow(payload: HoverPreviewPayload): Promise<void> {
  const win = await ensureWindow();
  await emit(PREVIEW_EVENT, payload);
  await win.setAlwaysOnTop(true);
  await win.show();
}

export async function hideHoverPreviewWindow(): Promise<void> {
  const win = await WebviewWindow.getByLabel(PREVIEW_LABEL);
  if (win) await win.hide();
  await emit(PREVIEW_EVENT, null);
}

export async function getScreenWorkBounds(): Promise<ScreenBounds> {
  const monitor = await currentMonitor();
  const scale = monitor?.scaleFactor ?? 1;
  const area = monitor?.workArea;
  if (!area) {
    return {
      minX: MARGIN,
      minY: MARGIN,
      maxX: window.screen.availWidth,
      maxY: window.screen.availHeight,
    };
  }
  return {
    minX: area.position.x / scale,
    minY: area.position.y / scale,
    maxX: area.position.x / scale + area.size.width / scale,
    maxY: area.position.y / scale + area.size.height / scale,
  };
}

export async function taskRectToScreen(rect: DOMRect): Promise<{
  taskTop: number;
  taskBottom: number;
  taskWidth: number;
  mainLeft: number;
  mainTop: number;
  mainRight: number;
  mainBottom: number;
}> {
  const main = getCurrentWindow();
  const [outer, size, scale] = await Promise.all([
    main.outerPosition(),
    main.outerSize(),
    main.scaleFactor(),
  ]);
  const mainLeft = outer.x / scale;
  const mainTop = outer.y / scale;
  const mainW = size.width / scale;
  const mainH = size.height / scale;
  return {
    taskTop: mainTop + rect.top,
    taskBottom: mainTop + rect.bottom,
    taskWidth: rect.width,
    mainLeft,
    mainTop,
    mainRight: mainLeft + mainW,
    mainBottom: mainTop + mainH,
  };
}

export function availableSideWidth(main: { left: number; right: number }, screen: ScreenBounds): number {
  const right = screen.maxX - MARGIN - (main.right + GAP);
  const left = main.left - GAP - (screen.minX + MARGIN);
  return Math.max(right, left);
}

export function preferredPreviewWidth(taskWidth: number, sideSpace: number): number {
  const remembered = rememberedSize?.w;
  if (remembered) return Math.min(remembered, Math.max(MIN_W, sideSpace));
  return Math.max(MIN_W, Math.min(taskWidth, sideSpace, 420));
}

export function preferredPreviewHeight(mainHeight: number): number {
  if (rememberedSize?.h) return rememberedSize.h;
  return Math.min(360, Math.max(200, Math.round(mainHeight * 0.42)));
}

export function computePreviewPlacement(
  width: number,
  height: number,
  anchor: Pick<HoverPreviewPayload, "taskTop" | "taskBottom" | "mainLeft" | "mainTop" | "mainRight" | "mainBottom">,
  screen: ScreenBounds,
): { x: number; y: number; width: number; height: number; side: "left" | "right" } {
  const spaceRight = screen.maxX - MARGIN - (anchor.mainRight + GAP);
  const spaceLeft = anchor.mainLeft - GAP - (screen.minX + MARGIN);

  let side: "left" | "right";
  if (spaceRight >= MIN_W && spaceLeft >= MIN_W) {
    side = spaceRight >= spaceLeft ? "right" : "left";
  } else if (spaceRight >= MIN_W) {
    side = "right";
  } else if (spaceLeft >= MIN_W) {
    side = "left";
  } else {
    side = spaceRight >= spaceLeft ? "right" : "left";
  }

  const availW = Math.max(MIN_W, side === "right" ? spaceRight : spaceLeft);
  const usedW = Math.min(Math.max(width, MIN_W), availW, MAX_W);
  const usedH = Math.min(
    Math.max(height, MIN_H),
    Math.max(MIN_H, screen.maxY - screen.minY - MARGIN * 2),
    MAX_H,
  );

  let x = side === "right" ? anchor.mainRight + GAP : anchor.mainLeft - usedW - GAP;
  x = Math.min(Math.max(x, screen.minX + MARGIN), screen.maxX - usedW - MARGIN);

  let y = anchor.taskTop;
  if (y + usedH > screen.maxY - MARGIN) y = screen.maxY - usedH - MARGIN;
  if (y < screen.minY + MARGIN) y = screen.minY + MARGIN;

  const mainH = anchor.mainBottom - anchor.mainTop;
  if (usedH <= mainH) {
    if (y < anchor.mainTop) y = anchor.mainTop;
    if (y + usedH > anchor.mainBottom) y = anchor.mainBottom - usedH;
  }

  return { x, y, width: usedW, height: usedH, side };
}

export async function placePreviewWindow(
  width: number,
  height: number,
  anchor: Pick<HoverPreviewPayload, "taskTop" | "taskBottom" | "mainLeft" | "mainTop" | "mainRight" | "mainBottom">,
  opts: { lockSize?: boolean } = {},
): Promise<void> {
  const win = await WebviewWindow.getByLabel(PREVIEW_LABEL);
  if (!win) return;

  let w = width;
  let h = height;
  if (opts.lockSize) {
    const [size, scale] = await Promise.all([win.innerSize(), win.scaleFactor()]);
    w = size.width / scale;
    h = size.height / scale;
  }

  const box = computePreviewPlacement(w, h, anchor, await getScreenWorkBounds());
  if (!opts.lockSize) {
    await win.setSize(new LogicalSize(box.width, box.height));
  }
  await win.setPosition(new LogicalPosition(Math.round(box.x), Math.round(box.y)));
}

export function listenPreviewPointer(
  onEnter: () => void,
  onLeave: () => void,
): Promise<UnlistenFn> {
  return listen<"enter" | "leave">(PREVIEW_POINTER, (e) => {
    if (e.payload === "enter") onEnter();
    else onLeave();
  });
}

export function listenPreviewHold(onHold: (held: boolean) => void): Promise<UnlistenFn> {
  return listen<"hold" | "release">(PREVIEW_HOLD, (e) => {
    onHold(e.payload === "hold");
  });
}

async function isAppFocused(): Promise<boolean> {
  const main = getCurrentWindow();
  if (await main.isFocused().catch(() => false)) return true;
  const preview = await WebviewWindow.getByLabel(PREVIEW_LABEL);
  if (preview && await preview.isFocused().catch(() => false)) return true;
  return false;
}

/** 主窗和预览窗都失去焦点时关闭预览 */
export async function listenAppUnfocus(onUnfocus: () => void): Promise<UnlistenFn> {
  const main = getCurrentWindow();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const check = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void isAppFocused().then((focused) => { if (!focused) onUnfocus(); });
    }, 80);
  };

  const unMain = await main.onFocusChanged(({ payload: focused }) => {
    if (!focused) check();
  });

  const unPrev = await listen<"focus" | "blur">(PREVIEW_FOCUS, (e) => {
    if (e.payload === "blur") check();
  });

  return () => {
    if (timer) clearTimeout(timer);
    unMain();
    unPrev();
  };
}
