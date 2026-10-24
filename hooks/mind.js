import { moodOfTool, react, words } from "../src/moods.js";
import { blend, colorOf, draw, size } from "./sprite.js";

export const crop = { columns: size.width * 2, rows: size.height * 2 };
const sleepAfter = 45000;
const fade = 500;

const short = (text, length = 48) => {
  const value = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
};

export function createMind() {
  let now = 0;
  let mood = "idle";
  let note = "";
  let pending = null;
  let cwd = "";
  let startedAt = 0;
  let since = 0;
  let from = colorOf("idle");
  let asked = null;
  let failedAt = -Infinity;
  let lastFailed = false;

  const skinAt = (at) => {
    const k = Math.min(1, Math.max(0, (at - since) / fade));
    const eased = k * k * (3 - 2 * k);
    return blend(from, colorOf(mood), eased);
  };

  const local = (path) => {
    const text = String(path ?? "");
    return cwd && text.startsWith(`${cwd}/`) ? text.slice(cwd.length + 1) : text;
  };

  const set = (next, text, at) => {
    now = at;
    const changed = next !== mood || text !== note;
    if (next !== mood) {
      from = skinAt(at);
      since = at;
    }
    mood = next;
    note = text;
    pending = next === "idle" ? { at: at + sleepAfter, mood: "sleeping" } : null;
    return changed;
  };

  return {
    reset(at, directory) {
      cwd = directory ?? "";
      return set("idle", "", at);
    },
    started(at) {
      startedAt = at;
    },
    label(tool, input = {}) {
      if (input.file_path || input.notebook_path) return `${tool} ${short(local(input.file_path ?? input.notebook_path))}`;
      if (input.command) return `${tool} ${short(input.command)}`;
      if (input.pattern) return `${tool} ${short(input.pattern, 32)}`;
      if (input.url) return `${tool} ${short(input.url)}`;
      if (input.description) return `${tool} ${short(input.description)}`;
      return tool;
    },
    elapsed(at) {
      return startedAt ? Math.max(1, Math.round((at - startedAt) / 1000)) : 0;
    },
    ask(tool, text, at) {
      asked = { mood: moodOfTool(tool), text };
      return this.feed({ hook_event_name: "PermissionRequest" }, `needs your ok for ${tool}`, at);
    },
    resume(at) {
      if (mood !== "waiting" || !asked) return false;
      const next = asked;
      asked = null;
      return set(next.mood, next.text, at);
    },
    finish(at, reason) {
      asked = null;
      if (reason === "error") return this.feed({ hook_event_name: "StopFailure" }, "the turn hit an error", at);
      if (reason === "aborted") return this.feed({ hook_event_name: "SessionStart" }, "", at);
      if (lastFailed) {
        pending = { at: Math.max(at, failedAt + 2600), mood: "idle" };
        return false;
      }
      const seconds = this.elapsed(at);
      return this.feed({ hook_event_name: "Stop" }, seconds ? `in ${seconds}s` : "", at);
    },
    feed(event, text, at) {
      if (event.hook_event_name === "PostToolUse") {
        asked = null;
        lastFailed = Boolean(event.failed);
        if (event.failed) failedAt = at;
      }
      if (event.hook_event_name === "UserPromptSubmit") lastFailed = false;
      const reaction = react(event);
      if (!reaction) return false;
      let changed = false;
      if (reaction.now) changed = set(reaction.now, text ?? "", at);
      else if (text !== undefined && text !== note) {
        note = text;
        changed = true;
      }
      if (reaction.later) pending = { at: at + reaction.later[0], mood: reaction.later[1] };
      return changed;
    },
    tick(at) {
      now = at;
      if (!pending || at < pending.at) return false;
      const next = pending.mood;
      pending = null;
      return set(next, "", at);
    },
    cells(at) {
      now = at;
      return draw(mood, at - since, at, skinAt(at));
    },
    get mood() {
      return mood;
    },
    get word() {
      return words[mood];
    },
    get note() {
      return note;
    },
  };
}
