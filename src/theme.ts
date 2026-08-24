/** 浅色侧栏 + 白底内容 + 蓝色强调（参考稿风格） */
export const ui = {
  accent: "#3B82F6",
  accentDeep: "#2563EB",
  accentGrad: "linear-gradient(135deg, #4C8DFF 0%, #2563EB 100%)",

  sidebar: "#F3F2EF",
  canvas: "#F7F6F3",
  card: "#FFFFFF",
  surface: "#FFFFFF",

  ink: "#171717",
  inkSoft: "#52525B",
  muted: "#8A8580",
  faint: "#B4AFA8",

  line: "rgba(23, 23, 23, 0.06)",
  lineStrong: "rgba(23, 23, 23, 0.10)",

  shadow: "0 18px 50px rgba(23,23,23,0.12), 0 2px 8px rgba(23,23,23,0.05)",
  shadowSoft: "0 12px 36px rgba(23,23,23,0.10), 0 1px 3px rgba(23,23,23,0.05)",
  cardShadow: "0 1px 2px rgba(23,23,23,0.04), 0 6px 18px rgba(23,23,23,0.05)",
  cardHover: "0 8px 24px rgba(23,23,23,0.10)",
  accentShadow: "0 8px 20px rgba(37,99,235,0.28)",

  // 兼容旧字段
  chrome: "#F3F2EF",
  chromeSoft: "#EBEAE6",
  chromeText: "#171717",
  chromeMuted: "#8A8580",
  chromeFaint: "#B4AFA8",
  paper: "#F7F6F3",
  paperDeep: "#EEEDEA",
} as const;

export const statusTone: Record<
  "todo" | "in-progress" | "done" | "cancelled",
  { fg: string; bg: string }
> = {
  todo: { fg: "#6B7280", bg: "#F3F4F6" },
  "in-progress": { fg: "#2563EB", bg: "#DBEAFE" },
  done: { fg: "#059669", bg: "#D1FAE5" },
  cancelled: { fg: "#6B7280", bg: "#F3F4F6" },
};

export function hexRgb(hex: string): string {
  const raw = hex.replace("#", "");
  const n = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ].join(", ");
}

export function tint(hex: string, alpha: number): string {
  return `rgba(${hexRgb(hex)}, ${alpha})`;
}
