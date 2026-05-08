# Publishing ChatGPT Bridge

This checklist publishes the plugin to GitHub and submits it to the Obsidian community plugin directory.

## Current Release

- Plugin id: `chatgpt-bridge`
- Plugin name: `ChatGPT Bridge`
- Version: `0.5.2`
- Minimum Obsidian version: `1.5.0`
- Release files: `manifest.json`, `main.js`, `styles.css`

## 1. Publish The Plugin Repository

Create a public GitHub repository for this plugin and push this repository to it.

Recommended repository name:

```text
obsidian-chatgpt-bridge
```

After creating the GitHub repository:

```bash
git remote add origin git@github.com:ranjugao/obsidian-chatgpt-bridge.git
git push -u origin main
```

If the repository owner changes, replace that part of the URL.

## 2. Create GitHub Release

Create a GitHub release with:

- Tag: `0.5.2`
- Title: `0.5.2`
- Attachments:
  - `release-assets/manifest.json`
  - `release-assets/main.js`
  - `release-assets/styles.css`

The tag must exactly match the `version` field in `manifest.json`. Do not prefix it with `v`.

Suggested release notes:

```markdown
## What's Changed

- Remove "Obsidian" from the plugin description for community directory review.

## Install

Download `manifest.json`, `main.js`, and `styles.css`, then place them in:

`.obsidian/plugins/chatgpt-bridge/`
```

## 3. Submit To Obsidian

Fork `obsidianmd/obsidian-releases`, edit `community-plugins.json`, and append this entry:

```json
{
  "id": "chatgpt-bridge",
  "name": "ChatGPT Bridge",
  "author": "LukeJiaoR",
  "description": "Local file bridge for sharing note context with ChatGPT/Codex and importing replies.",
  "repo": "ranjugao/obsidian-chatgpt-bridge"
}
```

If the GitHub repository owner changes, update the `repo` value before opening the pull request.

## 4. Future Updates

For each future release:

1. Update `manifest.json`.
2. Update `versions.json`.
3. Update `CHANGELOG.md`.
4. Build or update `main.js`.
5. Create a GitHub release whose tag exactly matches `manifest.json` version.
6. Upload `manifest.json`, `main.js`, and `styles.css`.

After the initial Obsidian directory submission is accepted, future versions only need GitHub releases.
