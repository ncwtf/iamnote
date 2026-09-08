import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { isMac } from "./platform";

export const GITHUB_REPO = "ncwtf/iamnote";
export const RELEASES_LATEST_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const RELEASES_LATEST_PAGE = `https://github.com/${GITHUB_REPO}/releases/latest`;

export type GithubAsset = {
  name: string;
  browser_download_url: string;
};

export type GithubRelease = {
  tag_name: string;
  html_url: string;
  body: string | null;
  assets: GithubAsset[];
};

export type UpdateInfo = {
  version: string;
  notes: string;
  pageUrl: string;
  downloadUrl: string;
};

export function parseVer(tag: string): [number, number, number] | null {
  const m = String(tag || "").replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

export function isNewer(remote: string, local: string): boolean {
  const a = parseVer(remote);
  const b = parseVer(local);
  if (!a) return false;
  if (!b) return true;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

export async function fetchLatestRelease(): Promise<GithubRelease> {
  const res = await fetch(RELEASES_LATEST_API);
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const data = (await res.json()) as GithubRelease;
  if (!data?.tag_name) throw new Error("无法读取版本信息");
  return data;
}

export async function hostArch(): Promise<string> {
  try {
    return await invoke<string>("host_arch");
  } catch {
    return "";
  }
}

export function pickDownloadUrl(release: GithubRelease, arch: string): string {
  const assets = release.assets ?? [];
  const name = (a: GithubAsset) => a.name.toLowerCase();
  let asset: GithubAsset | undefined;
  if (isMac) {
    const arm = arch === "aarch64" || arch === "arm64";
    asset = assets.find((a) => {
      const n = name(a);
      if (!n.endsWith(".dmg")) return false;
      if (arm) return n.includes("aarch64") || n.includes("arm64");
      return n.includes("x64") || n.includes("x86_64");
    }) ?? assets.find((a) => name(a).endsWith(".dmg"));
  } else {
    asset = assets.find((a) => {
      const n = name(a);
      return n.endsWith(".exe") && !n.includes("uninstall");
    });
  }
  return asset?.browser_download_url ?? release.html_url ?? RELEASES_LATEST_PAGE;
}

export async function checkGithubUpdate(): Promise<UpdateInfo | null> {
  const [local, release, arch] = await Promise.all([
    getVersion(),
    fetchLatestRelease(),
    hostArch(),
  ]);
  if (!isNewer(release.tag_name, local)) return null;
  return {
    version: release.tag_name.replace(/^v/i, ""),
    notes: (release.body ?? "").trim(),
    pageUrl: release.html_url || RELEASES_LATEST_PAGE,
    downloadUrl: pickDownloadUrl(release, arch),
  };
}
