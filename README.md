# Codex Bridge

[English](README.md) | [中文](README_zh.md)

![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-7c3aed)
![Desktop Only](https://img.shields.io/badge/Desktop-Only-111827)
![MCP](https://img.shields.io/badge/MCP-Localhost-2563eb)
![Local First](https://img.shields.io/badge/Local--First-059669)
![Codex](https://img.shields.io/badge/Codex-MCP-10a37f)
![License](https://img.shields.io/badge/License-MIT-f59e0b)

`codex-bridge` is a desktop-only plugin that connects your local vault to Codex. Its primary workflow is a localhost MCP endpoint that lets Codex search, read, and write notes without hardcoding a vault path. It also provides file-based bridge commands and optional AI summarization.

**Tags:** `obsidian-plugin` `mcp` `codex` `local-first` `markdown` `notes` `ai-summary`

## Quick Links

- [Features](#features)
- [Install](#install)
- [Local MCP server](#local-mcp-server)
- [MCP tools](#mcp-tools)
- [AI summarization](#ai-summarization)
- [Development](#development)

## Features

- Export active-note context for Codex
- Create request files from the active note
- Append the latest bridge reply back into the active note
- Create a new note from the latest bridge reply
- Summarize selected text or the active note into `Codex/YYYY-MM-DD.md`
- Deduplicate summaries with an MD5 hash marker
- Auto-tag summaries with `#coding`, `#tiktok`, `#business`, or `#ai`
- Switch plugin UI between Chinese and English
- Start a local MCP HTTP server bound to `127.0.0.1`

## Install

### Manual Install

1. Download or clone this repository.
2. Create the plugin directory inside your Obsidian vault:

```bash
mkdir -p "/path/to/your/vault/.obsidian/plugins/codex-bridge"
```

3. Copy these files into that directory:

```text
main.js
manifest.json
styles.css
```

4. Restart Obsidian.
5. Open `Settings -> Community plugins`.
6. Enable `Codex Bridge`.

Expected layout:

```text
your-vault/
  .obsidian/
    plugins/
      codex-bridge/
        main.js
        manifest.json
        styles.css
```

## Usage

Open the Obsidian command palette and search for `Codex Bridge`.

Common commands:

- `Export active note context`
  - Exports the current note context to `_codex_bridge/context/`
- `Create Codex request from active note`
  - Creates a request file based on the active note
- `Append latest bridge reply to active note`
  - Appends the newest Markdown reply from `_codex_bridge/replies/`
- `Create note from latest bridge reply`
  - Creates a new note from the newest reply
- `Open bridge index`
  - Opens the bridge folder README
- `AI summarize selection/current note to daily note`
  - Summarizes selected text first; if there is no selection, summarizes the active note

## Local MCP Server

The plugin can start a desktop-only local MCP HTTP server. It listens on `127.0.0.1` and requires bearer-token authorization for every `/mcp` request.

Recommended pairing:

- Install this plugin in Obsidian desktop.
- Install the `obsidian-connect` skill in Codex.
- This plugin exposes the current vault through a local MCP endpoint.
- The skill uses MCP tools to search, read, and write notes.

This does not make your vault available to hosted or mobile AI clients. `127.0.0.1` is only visible on the same machine.

Enable it in `Settings -> Codex Bridge`:

1. Turn on `Enable local MCP server`.
2. Keep the default `MCP port` of `8765`, unless you need another port.
3. Keep or regenerate the `MCP token`.
4. Click `Copy MCP config` when a local MCP client needs setup details.

Health check:

```text
GET http://127.0.0.1:8765/health
```

MCP JSON-RPC endpoint:

```text
POST http://127.0.0.1:8765/mcp
Authorization: Bearer <token>
Content-Type: application/json
```

Copied MCP config shape:

```json
{
  "name": "codex-bridge",
  "transport": "streamable-http-json-rpc",
  "endpoint": "http://127.0.0.1:8765/mcp",
  "url": "http://127.0.0.1:8765/mcp",
  "health": "http://127.0.0.1:8765/health",
  "headers": {
    "Authorization": "Bearer <token>"
  },
  "tools": ["search_notes", "read_note", "write_note", "append_note", "list_recent_notes", "save_chat_summary"],
  "codexEnv": {
    "OBSIDIAN_MCP_PORT": "8765",
    "OBSIDIAN_MCP_TOKEN": "<token>"
  }
}
```

If your MCP client only supports stdio, use the included proxy:

```json
{
  "mcpServers": {
    "codex-bridge": {
      "command": "node",
      "args": ["/path/to/codex-bridge/codex/obsidian-mcp-proxy.js"],
      "env": {
        "OBSIDIAN_MCP_PORT": "8765",
        "OBSIDIAN_MCP_TOKEN": "<token>"
      }
    }
  }
}
```

## MCP Tools

| Tool | Purpose |
| --- | --- |
| `search_notes` | Search Markdown notes in the current vault |
| `read_note` | Read a note by vault-relative path |
| `write_note` | Create or overwrite a note |
| `append_note` | Append Markdown content, creating the note if needed |
| `list_recent_notes` | List recently modified notes |
| `save_chat_summary` | Append a chat summary to `Codex/YYYY-MM-DD.md` |

Example:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_notes",
    "arguments": {
      "query": "obsidian",
      "limit": 10
    }
  }
}
```

## AI Summarization

AI summarization is optional. You do not need an API key for local file bridge workflows or the local MCP server.

To enable summarization:

1. Open `Settings -> Codex Bridge`.
2. Set `AI API key`.
3. Set `AI base URL`, default `https://api.openai.com/v1`.
4. Set `AI model`, default `gpt-4o-mini`.
5. Choose `AI API mode`.

Recommended modes:

| Scenario | AI base URL | AI API mode |
| --- | --- | --- |
| OpenAI-compatible provider | Provider `/v1` endpoint | `Chat Completions (/chat/completions)` |
| OpenAI Chat Completions | `https://api.openai.com/v1` | `Chat Completions (/chat/completions)` |
| OpenAI Responses API | `https://api.openai.com/v1` | `Responses (/responses)` |

Summary output uses:

```markdown
## Question
...

## Key Takeaways
...

## Action Steps
...

## Tags
#xxx #xxx
```

## Language

Open `Settings -> Codex Bridge`, then choose `English` or `中文`.

New installs default to English for the Obsidian community plugin directory. You can switch to Chinese at any time.

Language affects:

- Settings text
- Obsidian notices
- Command palette labels
- Exported context headings
- Generated bridge request headings
- AI summary prompt and summary headings

Command names are registered when Obsidian loads the plugin. Reload the plugin or restart Obsidian after changing language.

## Security

- The MCP server binds to `127.0.0.1` only.
- All `/mcp` requests require a bearer token.
- Do not share your MCP token with untrusted software.
- Do not expose the local endpoint to the public internet without a proper authentication and threat model.
- Do not commit Obsidian-generated `data.json`, API keys, tokens, or personal vault paths.

## Bridge Folder

Default folder:

```text
_codex_bridge/
  context/
  requests/
  replies/
  imported/
```

You can write Codex replies into `replies/`, then import them back into Obsidian with the plugin commands.

## Development

This repository includes the Obsidian-loadable `main.js` and matching `main.ts` source.

When changing plugin logic, update `main.ts` first and keep shipped `main.js` in sync.

Minimum Obsidian version: `1.5.0`

## Release

For a release, create a GitHub Release matching `manifest.json`, for example `0.6.0`, and upload:

- `main.js`
- `manifest.json`
- `styles.css`

Keep these files at repository root:

- `README.md`
- `README_zh.md`
- `LICENSE`
- `versions.json`

## Companion Project

For Codex-side usage, install the companion `obsidian-connect` skill. The skill uses this plugin's MCP endpoint and does not need a hardcoded vault path.
