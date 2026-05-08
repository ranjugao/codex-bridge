# Changelog

## 0.6.0

- Rename the plugin to Codex Bridge and set the plugin id to `codex-bridge`.
- Reposition the plugin around Codex MCP workflows.
- Update the plugin description for community directory review.

## 0.5.2

- Remove "Obsidian" from the plugin description for community directory review.

## 0.5.1

- Default the plugin UI language to English for community release installs.
- Keep Chinese and English language switching in settings.
- Localize generated bridge request and context headings.

## 0.5.0

- Add a desktop-only local MCP HTTP server started by the Obsidian plugin.
- Add bearer-token protection and localhost-only binding.
- Add MCP tools for searching, reading, writing, appending, listing recent notes, and saving chat summaries.
- Add settings for enabling the server, choosing the port, managing the token, and copying client config.

## 0.4.0

- Add Chinese and English language switching for settings, notices, commands, exported context headings, and AI summaries.
- Support OpenAI-compatible AI summary APIs with configurable base URL, model, and API mode.
- Add daily summary writing to `Codex/YYYY-MM-DD.md` with MD5 duplicate prevention.
- Add local bridge workflows for exporting note context, creating requests, and importing replies.
