import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const files = {
  "/": ["web/index.html", "text/html; charset=utf-8"],
  "/app.js": ["web/app.js", "text/javascript; charset=utf-8"],
  "/style.css": ["web/style.css", "text/css; charset=utf-8"],
  "/icon.svg": ["web/icon.svg", "image/svg+xml"],
  "/favicon.ico": ["web/icon.svg", "image/svg+xml"],
  "/src/index.js": ["src/index.js", "text/javascript; charset=utf-8"],
  "/src/engine.js": ["src/engine.js", "text/javascript; charset=utf-8"],
  "/src/sprites.js": ["src/sprites.js", "text/javascript; charset=utf-8"],
  "/src/moods.js": ["src/moods.js", "text/javascript; charset=utf-8"],
  "/src/sound.js": ["src/sound.js", "text/javascript; charset=utf-8"],
  "/src/color.js": ["src/color.js", "text/javascript; charset=utf-8"],
};

const short = (value, length = 80) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, length) : undefined);

function pathOf(file, cwd) {
  if (typeof file !== "string") return undefined;
  const local = cwd ? relative(cwd, file) : file;
  return short(local.startsWith("..") ? file : local);
}

function detailOf(input = {}, cwd) {
  if (input.file_path || input.notebook_path) return pathOf(input.file_path ?? input.notebook_path, cwd);
  if (input.command) return short(input.command);
  if (input.pattern) return [`pattern: "${short(input.pattern, 40)}"`, input.path ? `path: "${pathOf(input.path, cwd)}"` : null].filter(Boolean).join(", ");
  if (input.url) return short(input.url);
  if (input.query) return short(input.query);
  if (input.description) return short(input.description);
  return undefined;
}

function failureOf(payload) {
  if (payload.hook_event_name === "PostToolUseFailure") {
    const lines = String(payload.error ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const detail = lines.find((line) => !/^exit code \d+/i.test(line));
    return { failed: true, summary: short(payload.is_interrupt ? "Interrupted" : (detail ?? lines[0])) };
  }
  if (payload.hook_event_name !== "PostToolUse") return { failed: false };
  const response = payload.tool_response;
  if (!response || typeof response !== "object") return { failed: false };
  const failed = Boolean(response.is_error || response.isError || response.error || response.interrupted);
  return { failed, summary: failed ? short(String(response.error ?? response.stderr ?? "").split("\n").find((line) => line.trim())) : undefined };
}

export function eventOf(payload) {
  const { failed, summary } = failureOf(payload);
  return {
    hook_event_name: payload.hook_event_name,
    tool_name: payload.tool_name,
    detail: detailOf(payload.tool_input, payload.cwd),
    failed,
    summary,
    message: short(payload.message, 120),
    notification_type: payload.notification_type,
    source: payload.source,
    trigger: payload.trigger,
    project: typeof payload.cwd === "string" ? basename(payload.cwd) : undefined,
  };
}

export function startBridge({ port = 4317, log = console.log } = {}) {
  const clients = new Set();

  const broadcast = (event) => {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of clients) client.write(data);
  };

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/events") {
      response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
      response.write(": hello\n\n");
      clients.add(response);
      request.on("close", () => clients.delete(response));
      return;
    }

    if (request.method === "POST" && url.pathname === "/hook") {
      let body = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        body += chunk;
        if (body.length > 2_000_000) request.destroy();
      });
      request.on("end", () => {
        response.writeHead(204).end();
        try {
          const event = eventOf(JSON.parse(body));
          if (!event.hook_event_name) return;
          broadcast(event);
          log(`${new Date().toLocaleTimeString()}  ${event.hook_event_name}${event.tool_name ? ` ${event.tool_name}` : ""}${event.failed ? " failed" : ""}`);
        } catch {}
      });
      return;
    }

    const file = request.method === "GET" ? files[url.pathname] : undefined;
    if (file) {
      try {
        const content = await readFile(fileURLToPath(new URL(file[0], root)));
        response.writeHead(200, { "content-type": file[1], "cache-control": "no-store" });
        response.end(content);
      } catch {
        response.writeHead(500).end();
      }
      return;
    }

    response.writeHead(404).end();
  });

  const ping = setInterval(() => {
    for (const client of clients) client.write(": ping\n\n");
  }, 20000);

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () =>
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => {
          clearInterval(ping);
          for (const client of clients) client.end();
          server.close();
        },
      }),
    );
  });
}
