import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const marker = "via=termling";
export const events = ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "PostToolUseFailure", "PermissionRequest", "Notification", "PreCompact", "Stop"];
const matched = new Set(["PreToolUse", "PostToolUse", "PostToolUseFailure", "PermissionRequest"]);

export const defaultPath = () => join(homedir(), ".claude", "settings.json");

export function commandFor(port) {
  return `curl -s -m 1 -o /dev/null -X POST -H 'content-type: application/json' --data-binary @- 'http://127.0.0.1:${port}/hook?${marker}' || true`;
}

export function isOurs(hook) {
  return Boolean(hook) && typeof hook.command === "string" && hook.command.includes(marker);
}

function ours(groups) {
  return Array.isArray(groups) && groups.some((group) => Array.isArray(group?.hooks) && group.hooks.some(isOurs));
}

export function installedEvents(settings) {
  return events.filter((event) => ours(settings?.hooks?.[event]));
}

function check(settings) {
  if (settings === null || typeof settings !== "object" || Array.isArray(settings)) throw new Error("settings.json is not a JSON object, nothing was changed");
  if (settings.hooks !== undefined && (settings.hooks === null || typeof settings.hooks !== "object" || Array.isArray(settings.hooks))) {
    throw new Error("the hooks field in settings.json has an unexpected shape, nothing was changed");
  }
}

export function removeHooks(settings) {
  check(settings);
  const next = structuredClone(settings);
  if (!next.hooks) return next;
  for (const [event, groups] of Object.entries(next.hooks)) {
    if (!Array.isArray(groups) || !ours(groups)) continue;
    const kept = groups
      .map((group) => (Array.isArray(group?.hooks) ? { ...group, hooks: group.hooks.filter((hook) => !isOurs(hook)) } : group))
      .filter((group) => !Array.isArray(group?.hooks) || group.hooks.length > 0);
    if (kept.length) next.hooks[event] = kept;
    else delete next.hooks[event];
  }
  if (Object.keys(next.hooks).length === 0) delete next.hooks;
  return next;
}

export function addHooks(settings, port) {
  const next = removeHooks(settings);
  next.hooks = next.hooks ?? {};
  for (const event of events) {
    const group = { hooks: [{ type: "command", command: commandFor(port), async: true, timeout: 5 }] };
    next.hooks[event] = [...(Array.isArray(next.hooks[event]) ? next.hooks[event] : []), matched.has(event) ? { matcher: "*", ...group } : group];
  }
  return next;
}

export async function readSettings(path) {
  let text;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return { exists: false, settings: {} };
    throw error;
  }
  try {
    const settings = text.trim() ? JSON.parse(text) : {};
    check(settings);
    return { exists: true, settings };
  } catch (error) {
    throw new Error(`could not read ${path} as JSON (${error.message}), nothing was changed`);
  }
}

export async function writeSettings(path, settings, exists) {
  await mkdir(dirname(path), { recursive: true });
  let backup = null;
  if (exists) {
    backup = `${path}.termling-${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
    await copyFile(path, backup);
  }
  const temporary = `${path}.termling-${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  await rename(temporary, path);
  return backup;
}
