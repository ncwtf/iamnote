import { useCallback, useEffect, useRef, useState } from "react";

type HideFn = () => void;

let currentHide: HideFn | null = null;

function claim(hide: HideFn) {
  if (currentHide && currentHide !== hide) currentHide();
  currentHide = hide;
}

function release(hide: HideFn) {
  if (currentHide === hide) currentHide = null;
}

/** 悬停延迟出现；鼠标离开任务和预览（失焦）后关闭 */
export function useStickyPreview(enabled: boolean) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideFn = useRef<HideFn>(() => {});

  const hide = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setAnchorRect(null);
    release(hideFn.current);
  }, []);
  hideFn.current = hide;

  const scheduleShow = useCallback((el: HTMLElement | null) => {
    if (!enabled) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (showTimer.current) clearTimeout(showTimer.current);
    showTimer.current = setTimeout(() => {
      const rect = el?.getBoundingClientRect();
      if (!rect) return;
      claim(hideFn.current);
      setAnchorRect(rect);
    }, 300);
  }, [enabled]);

  /** 鼠标移入预览：取消关闭 */
  const keepOpen = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  /** 离开任务或预览：短暂缓冲后关闭（方便移入预览框） */
  const scheduleHide = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => hideFn.current(), 160);
  }, []);

  useEffect(() => () => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    release(hideFn.current);
  }, []);

  return { anchorRect, scheduleShow, scheduleHide, keepOpen, hide };
}
