import { execFileSync } from "node:child_process";
import { copyFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const pluginId = "termling@termling";
export const marketplace = "termling";
export const source = "damirsch/termling";

export async function findClaude() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  try {
    const found = execFileSync("which", ["claude"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (found) return found;
  } catch {}
  for (const root of [join(homedir(), ".cursor", "extensions"), join(homedir(), ".vscode", "extensions"), join(homedir(), ".windsurf", "extensions")]) {
    if (!existsSync(root)) continue;
    const names = (await readdir(root)).filter((name) => name.startsWith("anthropic.claude-code-")).sort().reverse();
    for (const name of names) {
      const binary = join(root, name, "resources", "native-binary", "claude");
      if (existsSync(binary)) return binary;
    }
  }
  return null;
}

export function touched() {
  const base = join(homedir(), ".claude");
  return [join(base, "settings.json"), join(base, "plugins", "known_marketplaces.json"), join(base, "plugins", "installed_plugins.json")];
}

export async function backup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const saved = [];
  for (const file of touched()) {
    if (!existsSync(file)) continue;
    const copy = `${file}.termling-${stamp}.bak`;
    await copyFile(file, copy);
    saved.push(copy);
  }
  return saved;
}

export function run(claude, args) {
  return execFileSync(claude, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export function listed(claude) {
  try {
    return run(claude, ["plugin", "list"]).includes("termling");
  } catch {
    return false;
  }
}
