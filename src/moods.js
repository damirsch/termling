export const moods = ["idle", "listening", "thinking", "reading", "searching", "writing", "running", "error", "waiting", "compacting", "done", "sleeping"];
export const words = {
  idle: "idle",
  listening: "listening",
  thinking: "thinking",
  reading: "reading files",
  searching: "searching",
  writing: "writing code",
  running: "running a command",
  error: "confused",
  waiting: "waiting for you",
  compacting: "compacting",
  done: "done",
  sleeping: "napping",
};
const tools = {
  Read: "reading",
  NotebookRead: "reading",
  WebFetch: "reading",
  Grep: "searching",
  Glob: "searching",
  LS: "searching",
  WebSearch: "searching",
  Edit: "writing",
  MultiEdit: "writing",
  Write: "writing",
  NotebookEdit: "writing",
  TodoWrite: "writing",
  Bash: "running",
  BashOutput: "running",
  KillShell: "running",
  Task: "thinking",
};
export function moodOfTool(tool = "") {
  if (tools[tool]) return tools[tool];
  if (tool.startsWith("mcp__")) return "running";
  return "thinking";
}
export function react(event) {
  switch (event.hook_event_name) {
    case "UserPromptSubmit":
      return { now: "listening", later: [1000, "thinking"] };
    case "PreToolUse":
      return { now: moodOfTool(event.tool_name) };
    case "PostToolUse":
      return event.failed ? { now: "error", later: [2600, "thinking"] } : { later: [700, "thinking"] };
    case "PostToolUseFailure":
      return { now: "error", later: [2600, "thinking"] };
    case "PermissionRequest":
      return { now: "waiting" };
    case "Notification":
      if (event.notification_type === "idle_prompt" || /waiting for your input/i.test(event.message ?? "")) return { now: "sleeping" };
      if (/permission|elicitation|needs_input/.test(event.notification_type ?? "") || /permission|needs your/i.test(event.message ?? "")) return { now: "waiting" };
      return null;
    case "PreCompact":
      return { now: "compacting", later: [12000, "idle"] };
    case "PostCompact":
    case "SessionStart":
      return { now: "idle" };
    case "StopFailure":
      return { now: "error", later: [3000, "idle"] };
    case "Stop":
      return { now: "done", later: [3400, "idle"] };
    case "SessionEnd":
      return { now: "sleeping" };
    default:
      return null;
  }
}
export function describe(event) {
  const name = event.hook_event_name;
  if (name === "PreToolUse" || name === "PostToolUse" || name === "PostToolUseFailure") return [name, event.tool_name, event.failed ? "failed" : ""].filter(Boolean).join(" ");
  if (name === "SessionStart" && event.source) return `${name} ${event.source}`;
  return name;
}
export function createBrain(initial, onMood, sleepAfter = 45000) {
  let mood = initial;
  let timer;
  const arm = (later) => {
    clearTimeout(timer);
    const rule = later ?? (mood === "idle" ? [sleepAfter, "sleeping"] : undefined);
    if (rule) timer = setTimeout(() => set(rule[1], undefined, null), rule[0]);
  };
  const set = (next, later, cause) => {
    if (next !== mood || cause) {
      mood = next;
      onMood(next, cause);
    }
    arm(later);
  };
  arm(undefined);
  return {
    feed(event) {
      const reaction = react(event);
      if (!reaction) return;
      if (reaction.now) set(reaction.now, reaction.later, describe(event));
      else arm(reaction.later);
    },
    set: (next) => set(next, undefined, null),
    stop: () => clearTimeout(timer),
  };
}
