# Obsidian ChatGPT Bridge

[English](README.md) | [中文](README_zh.md)

![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-7c3aed)
![Desktop Only](https://img.shields.io/badge/Desktop-Only-111827)
![MCP](https://img.shields.io/badge/MCP-Localhost-2563eb)
![Local First](https://img.shields.io/badge/Local--First-059669)
![ChatGPT](https://img.shields.io/badge/ChatGPT-Codex-10a37f)
![License](https://img.shields.io/badge/License-MIT-f59e0b)

一个轻量的 Obsidian 桌面端插件，用本地文件夹和本地 MCP 服务把 Obsidian 笔记连接到 ChatGPT/Codex 工作流。它也支持把当前笔记内容发送到 OpenAI 或 OpenAI-compatible API，生成结构化 Markdown 摘要。

**标签：** `obsidian-plugin` `mcp` `chatgpt` `codex` `local-first` `markdown` `notes` `ai-summary`

> 仅支持 Obsidian 桌面端：插件使用了 Obsidian 桌面 API、Node `crypto` 和本地 HTTP 服务。

## 快速入口

- [功能](#功能)
- [安装](#安装)
- [本地 MCP 服务](#本地-mcp-服务)
- [AI 摘要分类规则](#ai-摘要分类规则)
- [开发](#开发)

## 功能

- 从当前笔记导出 ChatGPT/Codex 上下文
- 基于当前笔记创建 ChatGPT 请求文件
- 把 ChatGPT 回复追加回当前笔记
- 把最新 ChatGPT 回复创建为新笔记
- 将选中文本或整篇笔记发送到 AI API，总结到 `ChatGPT/YYYY-MM-DD.md`
- 使用 MD5 hash 防止同一段原文重复写入
- 按关键词自动打标签：`#coding`、`#tiktok`、`#business`、`#ai`
- 支持中文/英文语言切换，覆盖设置页、通知、命令名称和 AI 摘要输出语言
- 可选启动只监听 `127.0.0.1` 的本地 MCP HTTP 服务，让本机 MCP 客户端访问当前 Obsidian vault

AI 摘要输出格式固定为：

```markdown
## 问题
...

## 核心结论
...

## 可执行步骤
...

## Tags
#xxx #xxx
```

每条摘要前会写入：

```markdown
<!-- hash: xxxx -->
```

如果目标文件里已经包含相同 hash，插件会跳过写入。

## 安装

### 手动安装

1. 下载或克隆这个仓库。
2. 在你的 Obsidian vault 里创建插件目录：

```bash
mkdir -p "/path/to/your/vault/.obsidian/plugins/chatgpt-bridge"
```

3. 把这些文件复制进去：

```text
main.js
manifest.json
styles.css
```

4. 重启 Obsidian。
5. 打开 `Settings -> Community plugins`。
6. 关闭 Safe mode 后启用 `ChatGPT Bridge`。

最终目录应类似：

```text
your-vault/
  .obsidian/
    plugins/
      chatgpt-bridge/
        main.js
        manifest.json
        styles.css
```

## 配置 AI API

如果只使用本地文件桥接或本地 MCP 服务，不需要 API key。

如果要使用 AI 摘要：

1. 打开 `Settings -> ChatGPT Bridge`。
2. 在 `AI API key` 填入你的 API key。
3. 在 `AI base URL` 填入接口地址，默认是 `https://api.openai.com/v1`。
4. 在 `AI model` 填入模型名，默认是 `gpt-4o-mini`。
5. 在 `AI API mode` 选择接口模式。

推荐设置：

| 场景 | AI base URL | AI API mode |
| --- | --- | --- |
| OpenAI-compatible 第三方接口 | 供应商给你的 `/v1` 地址 | `Chat Completions (/chat/completions)` |
| OpenAI Chat Completions | `https://api.openai.com/v1` | `Chat Completions (/chat/completions)` |
| OpenAI Responses API | `https://api.openai.com/v1` | `Responses (/responses)` |

API key 会保存在当前 vault 的插件本地配置里，不要提交到仓库。

## 使用

打开 Obsidian 命令面板，搜索 `ChatGPT Bridge`。

常用命令：

- `Export active note context`
  - 把当前笔记上下文导出到 `_chatgpt_bridge/context/`
- `Create ChatGPT request from active note`
  - 基于当前笔记创建一个请求文件，方便复制给 ChatGPT/Codex
- `Append latest bridge reply to active note`
  - 把 `_chatgpt_bridge/replies/` 里的最新回复追加到当前笔记
- `Create note from latest bridge reply`
  - 用最新回复创建一篇新笔记
- `Open bridge index`
  - 打开桥接目录说明
- `AI summarize selection/current note to daily note`
  - 优先总结当前选中文本；没有选中文本时总结整篇当前笔记
  - 写入路径：`ChatGPT/YYYY-MM-DD.md`
  - 文件存在时 append，不存在时 create

## 语言切换

进入 `Settings -> ChatGPT Bridge`，在 `语言 / Language` 中选择：

- `English`
- `中文`

为了适合 Obsidian 社区插件库，新安装默认显示英文。你可以随时切换为中文。

语言切换会影响：

- 插件设置页文案
- Obsidian 通知
- 命令面板里的命令名称
- 导出的上下文 Markdown 标题
- 生成的桥接请求 Markdown 标题
- AI 摘要 prompt 和最终摘要章节标题

注意：Obsidian 的命令名称是在插件加载时注册的。切换语言后，请重载插件或重启 Obsidian，让命令面板名称刷新。

## 本地 MCP 服务

插件可以在 Obsidian 桌面端启动一个本地 MCP HTTP 服务。服务只监听 `127.0.0.1`，并要求所有 `/mcp` 请求携带 bearer token。这个 endpoint 是 `obsidian-connect` / Codex 侧推荐使用的插件端入口。

推荐搭配：

- Obsidian 端安装本插件
- Codex / ChatGPT 桌面端安装 `obsidian-connect` skill
- 本插件负责暴露当前 vault 的本地 MCP endpoint
- `obsidian-connect` skill 负责让本机 Codex 通过 MCP 搜索、读取和写入笔记

这个本地 MCP 服务不会让网页版或手机端 ChatGPT 自动访问你的电脑；`127.0.0.1` 只对本机可见。

进入 `Settings -> ChatGPT Bridge`：

1. 打开 `启用本地 MCP 服务 / Enable local MCP server`
2. 确认 `MCP 端口 / MCP port`，默认 `8765`
3. 确认 `MCP token`，留空会自动生成
4. 点击 `复制 MCP 配置 / Copy MCP config`

健康检查地址：

```text
GET http://127.0.0.1:8765/health
```

健康检查会返回当前 vault 名称、MCP endpoint 和可用 tool 名称，方便确认 Obsidian 端服务已经启动。

MCP JSON-RPC endpoint：

```text
POST http://127.0.0.1:8765/mcp
Authorization: Bearer <token>
Content-Type: application/json
```

`Copy MCP config` 会复制一段 JSON，包含：

```json
{
  "name": "obsidian-chatgpt-bridge",
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

如果 MCP 客户端只支持 stdio，可以使用仓库里的代理脚本把 stdio MCP 转发到 Obsidian 的本地 HTTP endpoint：

```json
{
  "mcpServers": {
    "obsidian-chatgpt-bridge": {
      "command": "node",
      "args": ["/path/to/obsidian-chatgpt-bridge/codex/obsidian-mcp-proxy.js"],
      "env": {
        "OBSIDIAN_MCP_PORT": "8765",
        "OBSIDIAN_MCP_TOKEN": "<token>"
      }
    }
  }
}
```

支持的 MCP tools：

| Tool | 作用 |
| --- | --- |
| `search_notes` | 搜索当前 vault 的 Markdown 笔记 |
| `read_note` | 读取指定笔记 |
| `write_note` | 创建或覆盖指定笔记 |
| `append_note` | 追加内容到指定笔记，不存在则创建 |
| `list_recent_notes` | 列出最近修改的笔记 |
| `save_chat_summary` | 把聊天总结追加到 `ChatGPT/YYYY-MM-DD.md` |

示例：

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

安全建议：

- 不要把 token 发给不信任的软件
- 不要把服务监听地址改成公网地址
- 不使用时关闭本地 MCP 服务

## AI 摘要分类规则

插件会根据原文自动追加标签：

| 关键词 | 标签 |
| --- | --- |
| `code`、`bug` | `#coding` |
| `tiktok` | `#tiktok` |
| `赚钱`、`monetize` | `#business` |
| 其他内容 | `#ai` |

## 文件桥接目录

插件默认使用：

```text
_chatgpt_bridge/
  context/
  requests/
  replies/
  imported/
```

你可以把 ChatGPT/Codex 的回复保存到 `replies/`，再用命令导入回当前笔记或创建新笔记。

## 开发

当前仓库直接包含 Obsidian 可加载的 `main.js`，以及对应的 `main.ts` 源码。

修改逻辑时建议先改 `main.ts`，再同步编译或更新 `main.js`。

最低 Obsidian 版本：`1.5.0`

## 发布到 Obsidian 插件库

发布时需要创建和 `manifest.json` 版本一致的 GitHub Release，例如 `0.5.0`，并把以下文件作为 release assets 上传：

- `main.js`
- `manifest.json`
- `styles.css`

仓库根目录还需要保留：

- `README.md`
- `README_zh.md`
- `LICENSE`
- `versions.json`

## 注意

- 这个插件通过 Obsidian Plugin API 写入文件，使用了 `app.vault.create` 和 `app.vault.modify`
- AI 摘要会请求你配置的 AI API，需要网络连接和有效 API key
- 不要把 Obsidian 生成的 `data.json` 提交到仓库，因为里面可能包含你的本地设置或 API key
