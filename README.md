# termling

> **Unofficial fan project.** termling is not affiliated with, endorsed by or sponsored by Anthropic. Claude Code and its mascot belong to Anthropic, and this is a love letter from a fan who wanted a tiny buddy on the desk.

termling is a small pixel critter that lives right inside Claude Code, in a band above the prompt. It is drawn with half block characters in true color, so it looks like the little block mascot on the welcome screen, and it reacts to what the session is doing. It perks up when you send a prompt, thinks, reads, squints through a magnifier while searching, types while editing, sweats through a shell command, turns red and puffs steam when a tool fails, gets dizzy and green while the context compacts, glows gold when the turn is done and falls asleep after a quiet spell.

## In Claude Code

Run this in a terminal:

```bash
claude plugin install termling --marketplace damirsch/termling
```

On an older Claude Code without `--marketplace`, the same in two steps:

```bash
claude plugin marketplace add damirsch/termling
claude plugin install termling@termling
```

Or let the helper do it. It asks first and saves backups of the Claude Code files it updates:

```bash
npx github:damirsch/termling mod install
```

Then start `claude` in a terminal. The critter shows above the prompt in every new terminal session, Cursor and VS Code integrated terminals included. Run `/termling` inside a session to hide it or bring it back, or collapse the band with its `[-]`.

The plugin needs no server and no hooks in settings: it listens to the session from inside Claude Code (prompts, tool calls and their results, permission requests, compaction, the end of a turn). It needs a recent Claude Code with plugin UI.

### What it cannot do yet

- It draws only where Claude Code draws plugin UI: the terminal and the desktop app. The chat panel of the Claude Code extension for VS Code and Cursor does not show plugin UI yet, so there the critter is invisible.
- While a permission dialog is open Claude Code hides the band, so the waiting state shows only as the dialog closes.
- Where an organization manages Claude Code, the permission, notification and compaction events skip personally installed plugins, so those states do not show.
- It needs a terminal with true color, which every current macOS and Linux terminal has.

### Removing it

```bash
npx github:damirsch/termling remove
```

removes the plugin and any termling hooks, after saving backups. By hand:

```bash
claude plugin uninstall termling@termling
claude plugin marketplace remove termling
```

## In a browser window

The older way still works: hooks in `~/.claude/settings.json` post each event to a tiny local bridge, and a page shows the critter big with a Pop out button for an always on top window (Document Picture in Picture in Chrome and Edge).

```bash
npx github:damirsch/termling              # ask, add hooks, start the bridge, open the page
npx github:damirsch/termling install      # only add the hooks
npx github:damirsch/termling uninstall    # remove only the hooks termling added
npx github:damirsch/termling bridge       # only start the bridge and the page
npx github:damirsch/termling status       # show which hooks are installed
```

Options: `--port 4317`, `--settings <file>` to work on another settings file, `--yes` to skip the question, `--no-open` to keep the browser closed, `--no-hooks` to start without touching settings. The hooks are async, write nothing to Claude's context and carry a `via=termling` marker, which is how `uninstall` finds exactly its own entries. The bridge listens on `127.0.0.1` only and never forwards prompts or file contents.

## Use the critter in your own agent UI

```bash
npm install github:damirsch/termling
```

```jsx
import { Termling, useAgentMood } from "termling/react";

function Buddy() {
  const [mood, feed] = useAgentMood("idle");
  return <Termling mood={mood} pixel={6} />;
}
```

`mood` is one of `idle`, `listening`, `thinking`, `reading`, `searching`, `writing`, `running`, `error`, `waiting`, `compacting`, `done` or `sleeping`. Feed `feed()` hook style events such as `{ hook_event_name: "PreToolUse", tool_name: "Read" }` and the brain picks the mood and the timing. Pass `perch` to make it sit on an edge with dangling legs, `onCue` to hear about sound moments, and `tint={false}` to keep it one color.

Without React:

```js
import { mount, createBrain, sound } from "termling";

const critter = mount(document.querySelector("#buddy"), { pixel: 5, onCue: sound.cue });
const brain = createBrain("idle", (mood) => critter.feel(mood));
brain.feed({ hook_event_name: "UserPromptSubmit" });
```

## License

The code is MIT. The look of the critter is a fan tribute to the Claude Code mascot, which belongs to Anthropic. If Anthropic asks for changes, this project will follow them.
