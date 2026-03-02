import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Group, Task } from "../types";

export const SYNC_FILE_NAME = "iamnote-data.json";

export interface SyncData {
  version: number;
  lastModifiedAt: string;
  groups: Group[];
  tasks: Task[];
}

/** 让用户选择同步文件夹 */
export async function pickSyncFolder(): Promise<string | null> {
  const result = await open({
    directory: true,
    multiple: false,
    title: "选择同步文件夹（放在网盘同步目录内）",
  });
  if (!result || Array.isArray(result)) return null;
  return result;
}

/** 构建同步文件完整路径 */
function syncFilePath(folder: string): string {
  const sep = folder.includes("\\") ? "\\" : "/";
  return `${folder}${sep}${SYNC_FILE_NAME}`;
}

/** 写入同步文件 */
export async function writeSyncFile(
  folder: string,
  groups: Group[],
  tasks: Task[]
): Promise<void> {
  const data: SyncData = {
    version: 1,
    lastModifiedAt: new Date().toISOString(),
    groups,
    tasks,
  };
  await invoke("write_file", {
    path: syncFilePath(folder),
    content: JSON.stringify(data, null, 2),
  });
}

/** 读取同步文件，返回 null 表示文件不存在或格式有误 */
export async function readSyncFile(folder: string): Promise<SyncData | null> {
  const path = syncFilePath(folder);
  const exists: boolean = await invoke("file_exists", { path });
  if (!exists) return null;

  try {
    const text: string = await invoke("read_file", { path });
    const data = JSON.parse(text) as SyncData;
    if (!Array.isArray(data.groups) || !Array.isArray(data.tasks)) return null;

    // 补齐旧版字段
    data.tasks = data.tasks.map((t) => ({
      ...t,
      favorited: t.favorited ?? false,
      completedAt: t.completedAt ?? null,
    }));
    return data;
  } catch {
    return null;
  }
}

/**
 * 启动时检查冲突，返回应加载的数据。
 * 策略：lastModifiedAt 较新的一方胜出。
 */
export async function resolveOnStartup(
  folder: string,
  localModifiedAt: string | null,
  localGroups: Group[],
  localTasks: Task[]
): Promise<{ groups: Group[]; tasks: Task[]; fromCloud: boolean }> {
  const cloudData = await readSyncFile(folder);

  if (!cloudData) {
    // 云端无数据，将本地数据推送到云端
    await writeSyncFile(folder, localGroups, localTasks);
    return { groups: localGroups, tasks: localTasks, fromCloud: false };
  }

  const localTime = localModifiedAt ? new Date(localModifiedAt).getTime() : 0;
  const cloudTime = new Date(cloudData.lastModifiedAt).getTime();

  if (cloudTime > localTime) {
    // 云端更新，拉取云端数据
    return { groups: cloudData.groups, tasks: cloudData.tasks, fromCloud: true };
  } else {
    // 本地更新，推送到云端
    await writeSyncFile(folder, localGroups, localTasks);
    return { groups: localGroups, tasks: localTasks, fromCloud: false };
  }
}
