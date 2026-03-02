import { load, Store } from "@tauri-apps/plugin-store";

let store: Store | null = null;

async function getStore(): Promise<Store> {
  if (!store) {
    store = await load("iamnote.json", { autoSave: true, defaults: {} });
  }
  return store;
}

export async function storageGet<T>(key: string): Promise<T | null> {
  const s = await getStore();
  return (await s.get<T>(key)) ?? null;
}

export async function storageSet<T>(key: string, value: T): Promise<void> {
  const s = await getStore();
  await s.set(key, value);
}
