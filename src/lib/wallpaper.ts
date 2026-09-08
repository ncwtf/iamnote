const MAX_EDGE = 1920;
const JPEG_QUALITY = 0.82;
const MAX_DATA_URL = 2_800_000;

export async function fileToWallpaperDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法处理图片");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  if (dataUrl.length > MAX_DATA_URL) {
    throw new Error("图片太大，请换一张更小的");
  }
  return dataUrl;
}

export function wash(rgb: string, alpha: number): string {
  return `rgba(${rgb}, ${alpha})`;
}

export const SIDEBAR_RGB = "243, 242, 239";
export const CANVAS_RGB = "247, 246, 243";
