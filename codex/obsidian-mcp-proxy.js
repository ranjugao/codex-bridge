#!/usr/bin/env node

const fs = require("fs");
const http = require("http");

function readPluginConfig() {
  const configPath = process.env.OBSIDIAN_MCP_CONFIG || process.argv[2];
  if (!configPath) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read Obsidian MCP config at ${configPath}: ${error.message}`);
  }
}

function mcpTarget() {
  const config = readPluginConfig();
  const endpoint = process.env.OBSIDIAN_MCP_ENDPOINT;
  const port = Number(process.env.OBSIDIAN_MCP_PORT || config.localMcpPort || 8765);
  const token = process.env.OBSIDIAN_MCP_TOKEN || config.localMcpToken;
  if (!token) {
    throw new Error(
      "Missing Obsidian MCP token. Enable ChatGPT Bridge local MCP server, then set OBSIDIAN_MCP_TOKEN or OBSIDIAN_MCP_CONFIG.",
    );
  }
  return {
    url: new URL(endpoint || `http://127.0.0.1:${port}/mcp`),
    token,
  };
}

function postJsonRpc(message) {
  const target = mcpTarget();
  const body = JSON.stringify(message);
  const options = {
    hostname: target.url.hostname,
    port: Number(target.url.port),
    path: target.url.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
      Authorization: `Bearer ${target.token}`,
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let response = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        response += chunk;
      });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${response}`));
          return;
        }
        try {
          resolve(JSON.parse(response));
        } catch (error) {
          reject(new Error(`Invalid JSON from Obsidian MCP: ${error.message}`));
        }
      });
    });
    req.setTimeout(15000, () => req.destroy(new Error("Obsidian MCP request timed out.")));
    req.on("error", reject);
    req.end(body);
  });
}

function writeMessage(message) {
  const body = JSON.stringify(message);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
}

let buffer = Buffer.alloc(0);

function parseMessages() {
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) return;

    const header = buffer.slice(0, headerEnd).toString("utf8");
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      throw new Error("Missing Content-Length header.");
    }

    const length = Number(match[1]);
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + length;
    if (buffer.length < bodyEnd) return;

    const raw = buffer.slice(bodyStart, bodyEnd).toString("utf8");
    buffer = buffer.slice(bodyEnd);
    handleMessage(JSON.parse(raw)).catch((error) => {
      writeMessage({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32000, message: error.message || String(error) },
      });
    });
  }
}

async function handleMessage(message) {
  if (message.method === "notifications/initialized") return;

  try {
    const response = await postJsonRpc(message);
    writeMessage(response);
  } catch (error) {
    writeMessage({
      jsonrpc: "2.0",
      id: message.id ?? null,
      error: { code: -32000, message: error.message || String(error) },
    });
  }
}

process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  try {
    parseMessages();
  } catch (error) {
    writeMessage({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: error.message || String(error) },
    });
  }
});

process.stdin.on("end", () => process.exit(0));
