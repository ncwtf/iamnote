import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { Group, Task } from "../types";

export interface BackupData {
  version: number;
  exportedAt: string;
  groups: Group[];
  tasks: Task[];
}

/** 导出：弹出保存对话框，写入 JSON 文件 */
export async function exportBackup(groups: Group[], tasks: Task[]): Promise<string | null> {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const filePath = await save({
    defaultPath: `iamnote-backup-${dateStr}.json`,
    filters: [{ name: "iamnote 备份", extensions: ["json"] }],
    title: "导出备份",
  });
  if (!filePath) return null;

  const data: BackupData = {
    version: 1,
    exportedAt: now.toISOString(),
    groups,
    tasks,
  };
  await writeTextFile(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

/** 导入：弹出打开对话框，读取并解析 JSON 文件 */
export async function importBackup(): Promise<BackupData | null> {
  const filePath = await open({
    multiple: false,
    filters: [{ name: "iamnote 备份", extensions: ["json"] }],
    title: "导入备份",
  });
  if (!filePath || Array.isArray(filePath)) return null;

  const text = await readTextFile(filePath);
  const data = JSON.parse(text) as BackupData;

  // 基本格式校验
  if (
    typeof data !== "object" ||
    !Array.isArray(data.groups) ||
    !Array.isArray(data.tasks)
  ) {
    throw new Error("文件格式不正确，请选择 iamnote 导出的备份文件");
  }

  // 兼容旧版字段（先展开，再补充缺失字段）
  data.tasks = data.tasks.map((t) => ({
    ...t,
    favorited: t.favorited ?? false,
    completedAt: t.completedAt ?? null,
    detail: t.detail ?? "",
  }));

  return data;
}
