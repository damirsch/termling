#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { startBridge } from "../lib/bridge.mjs";
import { backup, findClaude, listed, marketplace, pluginId, run, source } from "../lib/plugin.mjs";
import { addHooks, defaultPath, events, installedEvents, readSettings, removeHooks, writeSettings } from "../lib/settings.mjs";

const disclaimer = "termling is an unofficial fan project, not affiliated with or endorsed by Anthropic";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    port: { type: "string", default: "4317" },
    settings: { type: "string" },
    yes: { type: "boolean", short: "y", default: false },
    "no-open": { type: "boolean", default: false },
    "no-hooks": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

const command = values.help ? "help" : (positionals[0] ?? "start");
const port = Number(values.port);
const path = values.settings ?? defaultPath();

function say(text = "") {
  process.stdout.write(`${text}\n`);
}

async function confirm(question) {
  if (values.yes) return true;
  if (!process.stdin.isTTY) {
    say(`${question} (skipped, run again with --yes to agree without a prompt)`);
    return false;
  }
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await prompt.question(`${question} [y/N] `);
  prompt.close();
  return /^y(es)?$/i.test(answer.trim());
}

function openBrowser(url) {
  const opener = process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  try {
    spawn(opener[0], opener[1], { stdio: "ignore", detached: true }).unref();
  } catch {
    say(`Open ${url} in Chrome to see your buddy`);
  }
}

async function install() {
  const { exists, settings } = await readSettings(path);
  const present = installedEvents(settings);
  if (present.length === events.length && JSON.stringify(addHooks(settings, port)) === JSON.stringify(settings)) {
    say(`Hooks are already in ${path}`);
    return true;
  }
  say(`termling would add ${events.length} small hooks to ${path}`);
  say(`Each one posts the hook event to http://127.0.0.1:${port} in the background and never blocks Claude Code`);
  say(exists ? "A backup copy is saved next to the file first, and your other hooks stay as they are" : "The file does not exist yet, so it gets created");
  if (!(await confirm("Add them?"))) {
    say("Nothing changed");
    return false;
  }
  const backup = await writeSettings(path, addHooks(settings, port), exists);
  if (backup) say(`Backup saved to ${backup}`);
  say("Hooks added, they apply to new Claude Code sessions");
  return true;
}

async function uninstall() {
  const { exists, settings } = await readSettings(path);
  if (!exists || installedEvents(settings).length === 0) {
    say(`No termling hooks in ${path}`);
    return;
  }
  if (!(await confirm(`Remove the termling hooks from ${path}? Everything else stays`))) {
    say("Nothing changed");
    return;
  }
  const backup = await writeSettings(path, removeHooks(settings), exists);
  say(`Backup saved to ${backup}`);
  say("termling hooks removed");
}

async function status() {
  const { exists, settings } = await readSettings(path);
  const present = installedEvents(settings);
  say(exists ? `${path}` : `${path} does not exist yet`);
  say(present.length ? `termling hooks on ${present.join(", ")}` : "No termling hooks installed");
}

async function bridge() {
  const server = await startBridge({ port, log: (line) => say(line) });
  say(`Bridge running on ${server.url}`);
  say(`Open ${server.url} in Chrome and press Pop out for an always on top window`);
  if (!values["no-open"]) openBrowser(server.url);
  const stop = () => {
    server.close();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

async function claudeOrStop() {
  const claude = await findClaude();
  if (!claude) throw new Error("could not find the claude command, run again with CLAUDE_BIN=/path/to/claude");
  return claude;
}

async function modInstall() {
  const claude = await claudeOrStop();
  if (listed(claude)) {
    say("The termling plugin is already installed, it shows above the prompt in terminal sessions");
    return;
  }
  say(`termling would add itself to Claude Code as a plugin from github.com/${source}`);
  say("It draws a small critter above the prompt in terminal sessions and changes nothing else");
  say("Backups of the files Claude Code updates are saved next to them first");
  if (!(await confirm("Install the plugin?"))) {
    say("Nothing changed");
    return;
  }
  for (const copy of await backup()) say(`Backup saved to ${copy}`);
  run(claude, ["plugin", "marketplace", "add", source]);
  run(claude, ["plugin", "install", pluginId]);
  say("Installed, start a new claude session in a terminal to meet it");
  say("Run /termling inside a session to hide or show it");
}

async function modUninstall() {
  const claude = await claudeOrStop();
  if (!listed(claude)) {
    say("The termling plugin is not installed");
    return;
  }
  if (!(await confirm("Remove the termling plugin from Claude Code?"))) {
    say("Nothing changed");
    return;
  }
  for (const copy of await backup()) say(`Backup saved to ${copy}`);
  run(claude, ["plugin", "uninstall", pluginId]);
  try {
    run(claude, ["plugin", "marketplace", "remove", marketplace]);
  } catch {}
  say("termling plugin removed");
}

async function modStatus() {
  const claude = await claudeOrStop();
  say(listed(claude) ? `The termling plugin is installed (${pluginId})` : "The termling plugin is not installed");
}

function help() {
  say("termling, a tiny pixel buddy that reacts to your Claude Code session");
  say(disclaimer);
  say();
  say("Usage");
  say("  npx termling              add the hooks after asking, start the bridge, open the window");
  say("  npx termling install      only add the hooks");
  say("  npx termling uninstall    remove only the hooks termling added");
  say("  npx termling bridge       only start the bridge and the page");
  say("  npx termling status       show what is installed");
  say("  npx termling mod install  add the critter above the prompt in Claude Code terminal sessions");
  say("  npx termling mod uninstall  remove that plugin again");
  say("  npx termling remove       remove the plugin and the hooks, everything termling added");
  say();
  say("Options");
  say("  --port 4317               port for the local bridge");
  say("  --settings <file>         use another settings file instead of ~/.claude/settings.json");
  say("  --yes                     agree to the prompt without asking");
  say("  --no-open                 do not open the browser");
  say("  --no-hooks                start without touching settings");
}

try {
  if (command !== "help") {
    say(disclaimer);
    say();
  }
  if (command === "start") {
    if (!values["no-hooks"]) await install();
    await bridge();
  } else if (command === "install") await install();
  else if (command === "uninstall") await uninstall();
  else if (command === "status") await status();
  else if (command === "bridge") await bridge();
  else if (command === "mod" && positionals[1] === "install") await modInstall();
  else if (command === "mod" && positionals[1] === "uninstall") await modUninstall();
  else if (command === "mod") await modStatus();
  else if (command === "remove") {
    await modUninstall();
    await uninstall();
  }
  else help();
} catch (error) {
  say(`termling stopped: ${error.message}`);
  process.exit(1);
}
