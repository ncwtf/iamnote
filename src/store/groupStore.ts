import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { Group, GROUP_COLORS } from "../types";
import { storageGet, storageSet } from "../lib/storage";

interface GroupState {
  groups: Group[];
  activeGroupId: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  addGroup: (name: string) => void;
  updateGroup: (id: string, patch: Partial<Pick<Group, "name" | "color">>) => void;
  deleteGroup: (id: string) => void;
  setActive: (id: string) => void;
  replaceAll: (groups: Group[]) => Promise<void>;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  activeGroupId: null,
  loaded: false,

  load: async () => {
    const saved = await storageGet<Group[]>("groups");
    if (saved && saved.length > 0) {
      set({ groups: saved, activeGroupId: saved[0].id, loaded: true });
    } else {
      const defaultGroup: Group = {
        id: uuidv4(),
        name: "默认分组",
        color: GROUP_COLORS[0],
        order: 0,
      };
      set({ groups: [defaultGroup], activeGroupId: defaultGroup.id, loaded: true });
      await storageSet("groups", [defaultGroup]);
    }
  },

  addGroup: (name: string) => {
    const { groups } = get();
    const newGroup: Group = {
      id: uuidv4(),
      name,
      color: GROUP_COLORS[groups.length % GROUP_COLORS.length],
      order: groups.length,
    };
    const updated = [...groups, newGroup];
    set({ groups: updated, activeGroupId: newGroup.id });
    storageSet("groups", updated);
  },

  updateGroup: (id, patch) => {
    const updated = get().groups.map((g) => (g.id === id ? { ...g, ...patch } : g));
    set({ groups: updated });
    storageSet("groups", updated);
  },

  deleteGroup: (id) => {
    const { groups, activeGroupId } = get();
    const updated = groups.filter((g) => g.id !== id);
    const newActive =
      activeGroupId === id ? (updated[0]?.id ?? null) : activeGroupId;
    set({ groups: updated, activeGroupId: newActive });
    storageSet("groups", updated);
  },

  setActive: (id) => set({ activeGroupId: id }),

  replaceAll: async (groups) => {
    const newActive = groups[0]?.id ?? null;
    set({ groups, activeGroupId: newActive });
    await storageSet("groups", groups);
  },
}));
