import { readFileSync, writeFileSync } from "node:fs";

const raw = (process.argv[2] ?? "").trim();
const version = raw.replace(/^v/i, "");

if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.log(`skip version sync: invalid input "${raw}"`);
  process.exit(0);
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
pkg.version = version;
writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`);

const tauri = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
tauri.version = version;
writeFileSync("src-tauri/tauri.conf.json", `${JSON.stringify(tauri, null, 2)}\n`);

const cargoPath = "src-tauri/Cargo.toml";
const cargo = readFileSync(cargoPath, "utf8").replace(
  /^version = ".*"$/m,
  `version = "${version}"`
);
writeFileSync(cargoPath, cargo);

console.log(`synced package version to ${version}`);
