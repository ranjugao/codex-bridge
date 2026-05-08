const {
  App,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Platform,
  requestUrl,
  Setting,
  TFile,
} = require("obsidian");
const crypto = require("crypto");
const http = require("http");

const DEFAULT_SETTINGS = {
  language: "en",
  bridgeFolder: "_chatgpt_bridge",
  includeFrontmatter: true,
  includeBacklinks: true,
  appendHeading: "ChatGPT Response",
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
  openaiBaseUrl: "https://api.openai.com/v1",
  openaiApiMode: "chat_completions",
  localMcpEnabled: false,
  localMcpPort: 8765,
  localMcpToken: "",
};

const TEXT = {
  zh: {
    createRequestButton: "创建请求",
    cancelButton: "取消",
    commands: {
      exportContext: "导出当前笔记上下文",
      createRequest: "从当前笔记创建 ChatGPT 请求",
      appendReply: "追加最新桥接回复到当前笔记",
      createReplyNote: "从最新桥接回复创建笔记",
      openIndex: "打开桥接说明",
      summarize: "AI 总结选中文本/当前笔记到日记",
    },
    notices: {
      openMarkdown: "请先打开一篇 Markdown 笔记。",
      exportedContext: "已导出当前笔记上下文。",
      createdRequest: "已创建桥接请求：",
      noReply: "没有找到回复：",
      appendedReply: "已追加最新 ChatGPT 桥接回复。",
      createdReplyNote: "已从最新回复创建笔记：",
      noText: "没有可总结的文本。",
      missingApiKey: "请先在 ChatGPT Bridge 设置中填写 API key。",
      apiError: "AI API 错误：",
      duplicateSummary: "这段内容今天已经总结过了。",
      sendingSummary: "正在发送文本给 AI 服务生成摘要...",
      savedSummary: "AI 摘要已保存到 ",
      mcpStarted: "本地 MCP 服务已启动：",
      mcpStopped: "本地 MCP 服务已停止。",
      mcpStartFailed: "本地 MCP 服务启动失败：",
      mcpConfigCopied: "MCP 配置已复制。",
      mcpDesktopOnly: "本地 MCP 服务仅支持 Obsidian 桌面端。",
    },
    promptModal: {
      title: "创建 ChatGPT 请求",
      placeholder: "希望 ChatGPT/Codex 对这篇笔记做什么？",
      fallbackPrompt: "请帮助处理这篇笔记。",
    },
    context: {
      noItems: "无",
      contextTitle: "ChatGPT 上下文",
      requestTitle: "ChatGPT 请求",
      sourceNote: "源笔记",
      requestContext: "上下文",
      headings: "标题",
      backlinks: "反向链接",
      content: "正文",
      tags: "标签",
      source: "来源",
      sourceReply: "来源回复",
    },
    bridgeIndex: [
      "# ChatGPT Bridge",
      "",
      "这个文件夹用于在 Obsidian 和 ChatGPT/Codex 之间进行本地文件桥接。",
      "",
      "## 工作流",
      "",
      "1. 在 Obsidian 中运行 `ChatGPT Bridge: 导出当前笔记上下文` 或 `从当前笔记创建 ChatGPT 请求`。",
      "2. 在 ChatGPT/Codex 中读取这个文件夹里的文件，并把 Markdown 回复写入 `replies/`。",
      "3. 回到 Obsidian，运行 `追加最新桥接回复到当前笔记` 或 `从最新桥接回复创建笔记`。",
      "",
      "插件不会为本地桥接功能保存网络 API token。",
      "",
    ],
    summary: {
      question: "问题",
      conclusion: "核心结论",
      actions: "可执行步骤",
      fallbackQuestion: "需要对所选内容或当前笔记进行理解、提炼和整理。",
      fallbackConclusion: "AI 未返回可用摘要。",
      fallbackActions: ["复核上面的摘要是否符合原文。", "根据需要补充下一步行动。"],
      instruction: "请把下面的内容总结成结构化 Markdown。",
      strictFormat: "必须严格使用以下格式，不要添加额外一级标题：",
      requirements: "要求：",
      language: "- 使用中文。",
      tags: "- Tags 部分必须包含给定 tags，可以补充 1-3 个相关 tag。",
      action: "- 可执行步骤要具体、可落地。",
      source: "原始内容：",
      sourceLine: "来源",
      createdLine: "创建时间",
    },
    settings: {
      title: "ChatGPT Bridge",
      languageName: "语言",
      languageDesc: "切换插件界面、通知和 AI 摘要语言。命令面板名称会在重载插件后更新。",
      zh: "中文",
      en: "English",
      bridgeFolderName: "桥接文件夹",
      bridgeFolderDesc: "用于上下文导出、请求、回复和导入笔记的 vault 相对路径。",
      includeBacklinksName: "包含反向链接",
      includeBacklinksDesc: "导出上下文时包含链接到当前笔记的其他笔记。",
      appendHeadingName: "追加标题",
      appendHeadingDesc: "把回复追加到当前笔记时使用的标题。",
      apiKeyName: "AI API key",
      apiKeyDesc: "仅用于 AI 摘要命令，保存在本插件的本地 data.json。",
      baseUrlName: "AI base URL",
      baseUrlDesc: "OpenAI-compatible API base URL，例如 https://api.openai.com/v1 或第三方 /v1 endpoint。",
      modelName: "AI 模型",
      modelDesc: "AI 摘要使用的模型名，请使用你的服务商要求的模型名。",
      apiModeName: "AI API 模式",
      apiModeDesc: "大多数兼容接口使用 Chat Completions；OpenAI Responses API 使用 Responses。",
      localMcpEnabledName: "启用本地 MCP 服务",
      localMcpEnabledDesc: "在 Obsidian 桌面端启动仅监听 127.0.0.1 的本地 MCP HTTP 服务。",
      localMcpPortName: "MCP 端口",
      localMcpPortDesc: "本地 MCP 服务端口。修改后需要关闭再开启服务或重载插件。",
      localMcpTokenName: "MCP token",
      localMcpTokenDesc: "本地请求必须携带 Authorization: Bearer token。留空会自动生成。",
      copyMcpConfigName: "复制 MCP 配置",
      copyMcpConfigDesc: "复制给本地 MCP 客户端使用的 URL、header 和工具说明。",
      copyMcpConfigButton: "复制",
      reloadNotice: "语言已切换。请重载插件或重启 Obsidian，让命令面板名称更新。",
    },
  },
  en: {
    createRequestButton: "Create request",
    cancelButton: "Cancel",
    commands: {
      exportContext: "Export active note context",
      createRequest: "Create ChatGPT request from active note",
      appendReply: "Append latest bridge reply to active note",
      createReplyNote: "Create note from latest bridge reply",
      openIndex: "Open bridge index",
      summarize: "AI summarize selection/current note to daily note",
    },
    notices: {
      openMarkdown: "Open a Markdown note first.",
      exportedContext: "Exported active note context for ChatGPT.",
      createdRequest: "Created bridge request: ",
      noReply: "No reply found in ",
      appendedReply: "Appended latest ChatGPT bridge reply.",
      createdReplyNote: "Created note from latest reply: ",
      noText: "No text found to summarize.",
      missingApiKey: "Set API key in ChatGPT Bridge settings first.",
      apiError: "AI API error: ",
      duplicateSummary: "This text has already been summarized in today's ChatGPT note.",
      sendingSummary: "Sending text to AI provider for summary...",
      savedSummary: "AI summary saved to ",
      mcpStarted: "Local MCP server started: ",
      mcpStopped: "Local MCP server stopped.",
      mcpStartFailed: "Failed to start local MCP server: ",
      mcpConfigCopied: "MCP config copied.",
      mcpDesktopOnly: "The local MCP server is only available in Obsidian desktop.",
    },
    promptModal: {
      title: "Create ChatGPT request",
      placeholder: "What should ChatGPT/Codex do with this note?",
      fallbackPrompt: "Please help with this note.",
    },
    context: {
      noItems: "none",
      contextTitle: "ChatGPT Context",
      requestTitle: "ChatGPT Request",
      sourceNote: "Source Note",
      requestContext: "Context",
      headings: "Headings",
      backlinks: "Backlinks",
      content: "Content",
      tags: "Tags",
      source: "Source",
      sourceReply: "Source reply",
    },
    bridgeIndex: [
      "# ChatGPT Bridge",
      "",
      "This folder is a local file bridge between Obsidian and ChatGPT/Codex.",
      "",
      "## Workflow",
      "",
      "1. In Obsidian, run `ChatGPT Bridge: Export active note context` or `Create ChatGPT request from active note`.",
      "2. In ChatGPT/Codex, read files from this folder and write Markdown replies into `replies/`.",
      "3. In Obsidian, run `Append latest bridge reply to active note` or `Create note from latest bridge reply`.",
      "",
      "No network API token is stored by this plugin for local bridge workflows.",
      "",
    ],
    summary: {
      question: "Question",
      conclusion: "Key Takeaways",
      actions: "Action Steps",
      fallbackQuestion: "The selected text or current note needs to be understood, distilled, and organized.",
      fallbackConclusion: "The AI provider did not return a usable summary.",
      fallbackActions: ["Review whether the summary matches the source.", "Add next actions where needed."],
      instruction: "Summarize the following content as structured Markdown.",
      strictFormat: "Strictly use this format and do not add an extra top-level title:",
      requirements: "Requirements:",
      language: "- Use English.",
      tags: "- The Tags section must include the provided tags and may add 1-3 relevant tags.",
      action: "- Action steps must be concrete and practical.",
      source: "Source content:",
      sourceLine: "Source",
      createdLine: "Created",
    },
    settings: {
      title: "ChatGPT Bridge",
      languageName: "Language",
      languageDesc: "Switch plugin UI, notices, and AI summary language. Command palette names update after reload.",
      zh: "中文",
      en: "English",
      bridgeFolderName: "Bridge folder",
      bridgeFolderDesc: "Vault-relative folder for context exports, requests, replies, and imported notes.",
      includeBacklinksName: "Include backlinks",
      includeBacklinksDesc: "Include notes that link to the active note in exported context.",
      appendHeadingName: "Append heading",
      appendHeadingDesc: "Heading used when appending a reply to the active note.",
      apiKeyName: "AI API key",
      apiKeyDesc: "Used only by the AI summary command. Stored in this plugin's local data.json.",
      baseUrlName: "AI base URL",
      baseUrlDesc: "OpenAI-compatible API base URL, such as https://api.openai.com/v1 or a third-party /v1 endpoint.",
      modelName: "AI model",
      modelDesc: "Model used for AI summaries. Use the model name required by your provider.",
      apiModeName: "AI API mode",
      apiModeDesc: "Use Chat Completions for most OpenAI-compatible providers. Use Responses for OpenAI Responses API.",
      localMcpEnabledName: "Enable local MCP server",
      localMcpEnabledDesc: "Start a desktop-only local MCP HTTP server bound to 127.0.0.1.",
      localMcpPortName: "MCP port",
      localMcpPortDesc: "Local MCP server port. Disable and re-enable the server or reload the plugin after changing it.",
      localMcpTokenName: "MCP token",
      localMcpTokenDesc: "Requests must include Authorization: Bearer token. Leave empty to auto-generate one.",
      copyMcpConfigName: "Copy MCP config",
      copyMcpConfigDesc: "Copy URL, header, and tool details for local MCP clients.",
      copyMcpConfigButton: "Copy",
      reloadNotice: "Language changed. Reload the plugin or restart Obsidian to update command palette names.",
    },
  },
}


function nowStamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

function todayPath() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `ChatGPT/${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.md`;
}

function slugify(value) {
  return value
    .replace(/[\\/:*?"<>|#^[\]]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "note";
}

function md5(value) {
  return crypto.createHash("md5").update(value, "utf8").digest("hex");
}

function randomToken() {
  return crypto.randomBytes(24).toString("hex");
}

function joinUrl(baseUrl, path) {
  const base = (baseUrl || DEFAULT_SETTINGS.openaiBaseUrl).trim().replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function normalizeVaultPath(path) {
  const cleaned = (path || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
  const parts = cleaned.split("/").filter((part) => part && part !== ".");
  if (!parts.length || parts.includes("..")) throw new Error("Invalid vault path.");
  if (parts.includes(".obsidian") || parts.includes(".trash")) {
    throw new Error("Access to .obsidian and .trash through MCP is not allowed.");
  }
  const normalized = parts.join("/");
  if (!normalized.endsWith(".md")) throw new Error("Only Markdown notes are supported through MCP.");
  return normalized;
}

function classifyTags(value) {
  const lower = value.toLowerCase();
  const tags = new Set();
  if (lower.includes("code") || lower.includes("bug")) tags.add("#coding");
  if (lower.includes("tiktok")) tags.add("#tiktok");
  if (value.includes("赚钱") || lower.includes("monetize")) tags.add("#business");
  if (!tags.size) tags.add("#ai");
  return Array.from(tags);
}

function normalizeSummaryMarkdown(summary, tags, text) {
  const trimmed = (summary || "").trim();
  const required = [
    `## ${text.summary.question}`,
    `## ${text.summary.conclusion}`,
    `## ${text.summary.actions}`,
    "## Tags",
  ];
  const hasAllSections = required.every((heading) => trimmed.includes(heading));
  if (!hasAllSections) {
    return [
      `## ${text.summary.question}`,
      text.summary.fallbackQuestion,
      "",
      `## ${text.summary.conclusion}`,
      trimmed || text.summary.fallbackConclusion,
      "",
      `## ${text.summary.actions}`,
      ...text.summary.fallbackActions.map((item) => `- ${item}`),
      "",
      "## Tags",
      tags.join(" "),
    ].join("\n");
  }
  const [beforeTags, afterTags = ""] = trimmed.split("## Tags");
  const existingTags = new Set(afterTags.match(/#[\p{L}\p{N}_/-]+/gu) || []);
  for (const tag of tags) existingTags.add(tag);
  return `${beforeTags.trim()}\n\n## Tags\n${Array.from(existingTags).join(" ")}`.trim();
}

async function ensureFolder(app, folderPath) {
  const parts = folderPath.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!app.vault.getAbstractFileByPath(current)) {
      await app.vault.createFolder(current);
    }
  }
}

async function writeFile(app, path, content) {
  const folder = path.split("/").slice(0, -1).join("/");
  if (folder) await ensureFolder(app, folder);
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) {
    await app.vault.modify(existing, content);
  } else {
    await app.vault.create(path, content);
  }
}

class PromptModal extends Modal {
  value = "";

  constructor(app, titleText, placeholder, buttonText, cancelText, onSubmit) {
    super(app);
    this.titleText = titleText;
    this.placeholder = placeholder;
    this.buttonText = buttonText;
    this.cancelText = cancelText;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: this.titleText });
    const textarea = contentEl.createEl("textarea", {
      cls: "chatgpt-bridge-textarea",
      attr: { placeholder: this.placeholder },
    });
    textarea.addEventListener("input", (event) => {
      this.value = (event.target).value;
    });
    new Setting(contentEl)
      .addButton((button) =>
        button
          .setButtonText(this.buttonText)
          .setCta()
          .onClick(async () => {
            await this.onSubmit(this.value.trim());
            this.close();
          }),
      )
      .addButton((button) => button.setButtonText(this.cancelText).onClick(() => this.close()));
    textarea.focus();
  }

  onClose() {
    this.contentEl.empty();
  }
}

module.exports = class ChatGPTBridgePlugin extends Plugin {
    localMcpServer = null;

  get text() {
    return TEXT[this.settings.language || DEFAULT_SETTINGS.language];
  }

  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (!this.settings.localMcpToken) {
      this.settings.localMcpToken = randomToken();
      await this.saveSettings();
    }
    this.addSettingTab(new ChatGPTBridgeSettingTab(this.app, this));
    const text = this.text;

    this.addCommand({
      id: "export-active-note-context",
      name: text.commands.exportContext,
      callback: () => this.exportActiveNoteContext(),
    });

    this.addCommand({
      id: "create-request-from-active-note",
      name: text.commands.createRequest,
      callback: () => this.createRequestFromActiveNote(),
    });

    this.addCommand({
      id: "import-latest-reply-into-active-note",
      name: text.commands.appendReply,
      callback: () => this.appendLatestReplyToActiveNote(),
    });

    this.addCommand({
      id: "create-note-from-latest-reply",
      name: text.commands.createReplyNote,
      callback: () => this.createNoteFromLatestReply(),
    });

    this.addCommand({
      id: "open-bridge-index",
      name: text.commands.openIndex,
      callback: () => this.openBridgeIndex(),
    });

    this.addCommand({
      id: "ai-summarize-selection-to-daily-note",
      name: text.commands.summarize,
      callback: () => this.aiSummarizeSelectionToDailyNote(),
    });

    await this.ensureBridgeIndex();
    if (this.settings.localMcpEnabled) await this.startLocalMcpServer();
  }

  async onunload() {
    await this.stopLocalMcpServer();
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  localMcpUrl() {
    return `http://127.0.0.1:${this.settings.localMcpPort || DEFAULT_SETTINGS.localMcpPort}/mcp`;
  }

  localMcpConfig() {
    const port = String(this.settings.localMcpPort || DEFAULT_SETTINGS.localMcpPort);
    return {
      name: "obsidian-chatgpt-bridge",
      transport: "streamable-http-json-rpc",
      endpoint: this.localMcpUrl(),
      url: this.localMcpUrl(),
      health: `http://127.0.0.1:${port}/health`,
      headers: {
        Authorization: `Bearer ${this.settings.localMcpToken}`,
      },
      tools: this.localMcpTools().map((tool) => tool.name),
      codexEnv: {
        OBSIDIAN_MCP_PORT: port,
        OBSIDIAN_MCP_TOKEN: this.settings.localMcpToken,
      },
    };
  }

  async copyLocalMcpConfig() {
    const config = JSON.stringify(this.localMcpConfig(), null, 2);
    await navigator.clipboard.writeText(config);
    new Notice(this.text.notices.mcpConfigCopied);
  }

  async startLocalMcpServer() {
    if (this.localMcpServer) return;
    if (!Platform.isDesktopApp) {
      new Notice(this.text.notices.mcpDesktopOnly);
      throw new Error(this.text.notices.mcpDesktopOnly);
    }
    const port = Number(this.settings.localMcpPort) || DEFAULT_SETTINGS.localMcpPort;
    this.localMcpServer = http.createServer((req, res) => {
      this.handleLocalMcpRequest(req, res).catch((error) => {
        this.sendJson(res, 500, { error: String(error?.message || error) });
      });
    });
    await new Promise((resolve, reject) => {
      this.localMcpServer.once("error", reject);
      this.localMcpServer.listen(port, "127.0.0.1", () => {
        this.localMcpServer.off("error", reject);
        resolve();
      });
    }).catch((error) => {
      this.localMcpServer = null;
      new Notice(`${this.text.notices.mcpStartFailed}${String(error?.message || error)}`);
      throw error;
    });
    new Notice(`${this.text.notices.mcpStarted}${this.localMcpUrl()}`);
  }

  async stopLocalMcpServer() {
    if (!this.localMcpServer) return;
    const server = this.localMcpServer;
    this.localMcpServer = null;
    await new Promise((resolve) => server.close(() => resolve()));
    new Notice(this.text.notices.mcpStopped);
  }

  sendJson(res, status, data) {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "http://127.0.0.1",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    });
    res.end(JSON.stringify(data));
  }

  async readRequestBody(req) {
    return await new Promise((resolve, reject) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
        if (body.length > 10 * 1024 * 1024) {
          reject(new Error("Request body too large."));
          req.destroy();
        }
      });
      req.on("end", () => resolve(body));
      req.on("error", reject);
    });
  }

  async handleLocalMcpRequest(req, res) {
    if (req.method === "OPTIONS") {
      this.sendJson(res, 204, {});
      return;
    }
    if (req.method === "GET" && req.url === "/health") {
      this.sendJson(res, 200, {
        ok: true,
        name: "obsidian-chatgpt-bridge",
        vault: this.app.vault.getName(),
        endpoint: this.localMcpUrl(),
        tools: this.localMcpTools().map((tool) => tool.name),
      });
      return;
    }
    if (req.method !== "POST" || req.url !== "/mcp") {
      this.sendJson(res, 404, { error: "Not found." });
      return;
    }
    const auth = String(req.headers.authorization || "");
    if (auth !== `Bearer ${this.settings.localMcpToken}`) {
      this.sendJson(res, 401, { error: "Unauthorized." });
      return;
    }
    const raw = await this.readRequestBody(req);
    const message = raw ? JSON.parse(raw) : {};
    const response = await this.handleMcpJsonRpc(message);
    if (!response) {
      this.sendJson(res, 202, { ok: true });
      return;
    }
    this.sendJson(res, 200, response);
  }

  async handleMcpJsonRpc(message) {
    const id = message.id ?? null;
    try {
      if (message.method === "initialize") {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2025-03-26",
            capabilities: { tools: {} },
            serverInfo: { name: "obsidian-chatgpt-bridge", version: "0.5.1" },
          },
        };
      }
      if (message.method === "notifications/initialized") return null;
      if (message.method === "tools/list") {
        return { jsonrpc: "2.0", id, result: { tools: this.localMcpTools() } };
      }
      if (message.method === "tools/call") {
        const name = message.params?.name;
        const args = message.params?.arguments || {};
        const result = await this.callLocalMcpTool(name, args);
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          },
        };
      }
      return { jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found." } };
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32000, message: String(error?.message || error) },
      };
    }
  }

  localMcpTools() {
    return [
      {
        name: "search_notes",
        description: "Search Markdown notes in the current Obsidian vault.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            limit: { type: "number", default: 20 },
          },
          required: ["query"],
        },
      },
      {
        name: "read_note",
        description: "Read a Markdown note by vault-relative path.",
        inputSchema: {
          type: "object",
          properties: { path: { type: "string" } },
          required: ["path"],
        },
      },
      {
        name: "write_note",
        description: "Create or overwrite a Markdown note by vault-relative path.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string" },
            content: { type: "string" },
            overwrite: { type: "boolean", default: false },
          },
          required: ["path", "content"],
        },
      },
      {
        name: "append_note",
        description: "Append Markdown content to a note, creating it if needed.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string" },
            content: { type: "string" },
          },
          required: ["path", "content"],
        },
      },
      {
        name: "list_recent_notes",
        description: "List recently modified Markdown notes.",
        inputSchema: {
          type: "object",
          properties: { limit: { type: "number", default: 20 } },
        },
      },
      {
        name: "save_chat_summary",
        description: "Append a chat summary to the daily ChatGPT note.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
          },
          required: ["content"],
        },
      },
    ];
  }

  async callLocalMcpTool(name, args) {
    if (name === "search_notes") return await this.mcpSearchNotes(args);
    if (name === "read_note") return await this.mcpReadNote(args);
    if (name === "write_note") return await this.mcpWriteNote(args);
    if (name === "append_note") return await this.mcpAppendNote(args);
    if (name === "list_recent_notes") return this.mcpListRecentNotes(args);
    if (name === "save_chat_summary") return await this.mcpSaveChatSummary(args);
    throw new Error(`Unknown tool: ${name}`);
  }

  async mcpSearchNotes(args) {
    const query = String(args.query || "").toLowerCase().trim();
    if (!query) throw new Error("query is required.");
    const limit = Math.max(1, Math.min(Number(args.limit) || 20, 100));
    const results = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      const haystack = `${file.path}\n${file.basename}`.toLowerCase();
      let content = "";
      if (!haystack.includes(query)) content = await this.app.vault.read(file);
      if (haystack.includes(query) || content.toLowerCase().includes(query)) {
        const text = content || (await this.app.vault.read(file));
        const index = text.toLowerCase().indexOf(query);
        const snippet = index >= 0 ? text.slice(Math.max(0, index - 80), index + query.length + 160) : text.slice(0, 240);
        results.push({ path: file.path, basename: file.basename, mtime: file.stat.mtime, snippet });
      }
      if (results.length >= limit) break;
    }
    return { query, results };
  }

  async mcpReadNote(args) {
    const path = normalizeVaultPath(args.path);
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile) || file.extension !== "md") throw new Error(`Markdown note not found: ${path}`);
    return { path: file.path, content: await this.app.vault.read(file), stat: file.stat };
  }

  async mcpWriteNote(args) {
    const path = normalizeVaultPath(args.path);
    const content = String(args.content ?? "");
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      if (!args.overwrite) throw new Error(`Note already exists: ${path}`);
      await this.app.vault.modify(existing, content);
      return { path, action: "modified" };
    }
    await writeFile(this.app, path, content);
    return { path, action: "created" };
  }

  async mcpAppendNote(args) {
    const path = normalizeVaultPath(args.path);
    const content = String(args.content ?? "");
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      const current = await this.app.vault.read(existing);
      await this.app.vault.modify(existing, `${current.trimEnd()}\n\n${content.trimStart()}`);
      return { path, action: "appended" };
    }
    await writeFile(this.app, path, content);
    return { path, action: "created" };
  }

  mcpListRecentNotes(args) {
    const limit = Math.max(1, Math.min(Number(args.limit) || 20, 100));
    const notes = this.app.vault
      .getMarkdownFiles()
      .sort((a, b) => b.stat.mtime - a.stat.mtime)
      .slice(0, limit)
      .map((file) => ({ path: file.path, basename: file.basename, mtime: file.stat.mtime }));
    return { notes };
  }

  async mcpSaveChatSummary(args) {
    const title = String(args.title || "Chat summary").trim();
    const content = String(args.content || "").trim();
    if (!content) throw new Error("content is required.");
    const tags = Array.isArray(args.tags) ? args.tags.map((tag) => String(tag)) : ["chatgpt-log", "obsidian"];
    const block = [
      `## ${title}`,
      "",
      `Created: ${new Date().toISOString()}`,
      "",
      content,
      "",
      "## Tags",
      tags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" "),
    ].join("\n");
    const outputPath = todayPath();
    await this.mcpAppendNote({ path: outputPath, content: block });
    return { path: outputPath, action: "saved" };
  }

  getActiveMarkdownFile() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      new Notice(this.text.notices.openMarkdown);
      return null;
    }
    return file;
  }

  async buildContext(file) {
    const content = await this.app.vault.read(file);
    const cache = this.app.metadataCache.getFileCache(file) || {};
    const backlinks = [];

    if (this.settings.includeBacklinks) {
      const resolved = this.app.metadataCache.resolvedLinks || {};
      for (const [source, links] of Object.entries(resolved)) {
        if ((links)[file.path]) backlinks.push(source);
      }
    }

    return {
      exportedAt: new Date().toISOString(),
      vaultName: this.app.vault.getName(),
      file: { path: file.path, basename: file.basename, name: file.name },
      frontmatter: this.settings.includeFrontmatter ? cache.frontmatter || {} : {},
      tags: (cache.tags || []).map((item) => item.tag),
      headings: (cache.headings || []).map((item) => ({
        heading: item.heading,
        level: item.level,
        position: item.position,
      })),
      links: cache.links || [],
      embeds: cache.embeds || [],
      backlinks,
      content,
    };
  }

  contextToMarkdown(context) {
    const text = this.text;
    const tags = context.tags.length ? context.tags.join(", ") : text.context.noItems;
    const backlinks = context.backlinks.length
      ? context.backlinks.map((item) => `- [[${item.replace(/\.md$/, "")}]]`).join("\n")
      : `- ${text.context.noItems}`;
    const headings = context.headings.length
      ? context.headings.map((item) => `${"  ".repeat(Math.max(0, item.level - 1))}- ${item.heading}`).join("\n")
      : `- ${text.context.noItems}`;
    return [
      "---",
      "generated_by: chatgpt-bridge",
      `source_note: "${context.file.path.replace(/"/g, '\\"')}"`,
      `exported_at: "${context.exportedAt}"`,
      "---",
      "",
      `# ${text.context.contextTitle}: ${context.file.basename}`,
      "",
      `${text.context.source}: [[${context.file.path.replace(/\.md$/, "")}]]`,
      "",
      `${text.context.tags}: ${tags}`,
      "",
      `## ${text.context.headings}`,
      "",
      headings,
      "",
      `## ${text.context.backlinks}`,
      "",
      backlinks,
      "",
      `## ${text.context.content}`,
      "",
      context.content,
      "",
    ].join("\n");
  }

  async exportActiveNoteContext() {
    const file = this.getActiveMarkdownFile();
    if (!file) return;
    const context = await this.buildContext(file);
    const base = `${this.settings.bridgeFolder}/context`;
    await writeFile(this.app, `${base}/current-note.json`, JSON.stringify(context, null, 2));
    await writeFile(this.app, `${base}/current-note.md`, this.contextToMarkdown(context));
    new Notice(this.text.notices.exportedContext);
  }

  async createRequestFromActiveNote() {
    const file = this.getActiveMarkdownFile();
    if (!file) return;
    const text = this.text;
    new PromptModal(this.app, text.promptModal.title, text.promptModal.placeholder, text.createRequestButton, text.cancelButton, async (prompt) => {
      const context = await this.buildContext(file);
      const name = `${nowStamp()}-${slugify(file.basename)}.md`;
      const path = `${this.settings.bridgeFolder}/requests/${name}`;
      const request = [
        "---",
        "generated_by: chatgpt-bridge",
        `source_note: "${file.path.replace(/"/g, '\\"')}"`,
        `created_at: "${new Date().toISOString()}"`,
        "status: open",
        "---",
        "",
        `# ${text.context.requestTitle}`,
        "",
        prompt || text.promptModal.fallbackPrompt,
        "",
        `## ${text.context.sourceNote}`,
        "",
        `[[${file.path.replace(/\.md$/, "")}]]`,
        "",
        `## ${text.context.requestContext}`,
        "",
        this.contextToMarkdown(context),
      ].join("\n");
      await writeFile(this.app, path, request);
      new Notice(`${text.notices.createdRequest}${path}`);
    }).open();
  }

  async latestReplyFile() {
    const folderPath = `${this.settings.bridgeFolder}/replies`;
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!folder || !folder.children) return null;
    const files = folder.children
      .filter((child) => child instanceof TFile && child.extension === "md")
      .sort((a, b) => b.stat.mtime - a.stat.mtime);
    return files[0] || null;
  }

  async appendLatestReplyToActiveNote() {
    const target = this.getActiveMarkdownFile();
    if (!target) return;
    const reply = await this.latestReplyFile();
    if (!reply) {
      new Notice(`${this.text.notices.noReply}${this.settings.bridgeFolder}/replies.`);
      return;
    }
    const replyContent = await this.app.vault.read(reply);
    const current = await this.app.vault.read(target);
    const section = [
      "",
      `## ${this.settings.appendHeading} (${new Date().toLocaleString()})`,
      "",
      `${this.text.context.sourceReply}: [[${reply.path.replace(/\.md$/, "")}]]`,
      "",
      replyContent,
      "",
    ].join("\n");
    await this.app.vault.modify(target, current.trimEnd() + "\n" + section);
    new Notice(this.text.notices.appendedReply);
  }

  async createNoteFromLatestReply() {
    const reply = await this.latestReplyFile();
    if (!reply) {
      new Notice(`${this.text.notices.noReply}${this.settings.bridgeFolder}/replies.`);
      return;
    }
    const replyContent = await this.app.vault.read(reply);
    const path = `${this.settings.bridgeFolder}/imported/${nowStamp()}-${slugify(reply.basename)}.md`;
    await writeFile(this.app, path, replyContent);
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) await this.app.workspace.getLeaf(true).openFile(file);
    new Notice(`${this.text.notices.createdReplyNote}${path}`);
  }

  async ensureBridgeIndex() {
    const folder = this.settings.bridgeFolder;
    await ensureFolder(this.app, `${folder}/context`);
    await ensureFolder(this.app, `${folder}/requests`);
    await ensureFolder(this.app, `${folder}/replies`);
    await ensureFolder(this.app, `${folder}/imported`);
    const readme = `${folder}/README.md`;
    if (!this.app.vault.getAbstractFileByPath(readme)) {
      await writeFile(this.app, readme, this.text.bridgeIndex.join("\n"));
    }
  }

  async openBridgeIndex() {
    await this.ensureBridgeIndex();
    const file = this.app.vault.getAbstractFileByPath(`${this.settings.bridgeFolder}/README.md`);
    if (file instanceof TFile) await this.app.workspace.getLeaf(true).openFile(file);
  }

  async getSelectedTextOrFile() {
    const file = this.getActiveMarkdownFile();
    if (!file) return null;
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const selected = view?.editor ? view.editor.getSelection() : "";
    const text = selected && selected.trim() ? selected : await this.app.vault.read(file);
    if (!text.trim()) {
      new Notice(this.text.notices.noText);
      return null;
    }
    return { file, text };
  }

  buildSummaryPrompt(text, tags) {
    const summary = this.text.summary;
    return [
      summary.instruction,
      summary.strictFormat,
      "",
      `## ${summary.question}`,
      "...",
      "",
      `## ${summary.conclusion}`,
      "...",
      "",
      `## ${summary.actions}`,
      "...",
      "",
      "## Tags",
      tags.join(" "),
      "",
      summary.requirements,
      summary.language,
      summary.tags,
      summary.action,
      "",
      summary.source,
      text,
    ].join("\n");
  }

  async callAIProvider(prompt) {
    if (!this.settings.openaiApiKey) {
      new Notice(this.text.notices.missingApiKey);
      return null;
    }
    const apiMode = this.settings.openaiApiMode || DEFAULT_SETTINGS.openaiApiMode;
    const requestBody =
      apiMode === "responses"
        ? {
            model: this.settings.openaiModel || DEFAULT_SETTINGS.openaiModel,
            input: prompt,
          }
        : {
            model: this.settings.openaiModel || DEFAULT_SETTINGS.openaiModel,
            messages: [{ role: "user", content: prompt }],
          };
    const response = await requestUrl({
      url: joinUrl(
        this.settings.openaiBaseUrl || DEFAULT_SETTINGS.openaiBaseUrl,
        apiMode === "responses" ? "/responses" : "/chat/completions",
      ),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.settings.openaiApiKey}`,
      },
      body: JSON.stringify(requestBody),
      throw: false,
    });
    if (response.status < 200 || response.status >= 300) {
      const message = response.text ? response.text.slice(0, 240) : `HTTP ${response.status}`;
      new Notice(`${this.text.notices.apiError}${message}`);
      return null;
    }
    const data = response.json || JSON.parse(response.text);
    const chatText = data.choices?.[0]?.message?.content;
    if (chatText) return chatText.trim();
    if (data.output_text) return data.output_text.trim();
    const output = (data.output || [])
      .flatMap((item) => item.content || [])
      .filter((item) => item.type === "output_text" && item.text)
      .map((item) => item.text)
      .join("\n")
      .trim();
    return output || null;
  }

  async aiSummarizeSelectionToDailyNote() {
    const input = await this.getSelectedTextOrFile();
    if (!input) return;
    const hash = md5(input.text);
    const hashMarker = `<!-- hash: ${hash} -->`;
    const outputPath = todayPath();
    const existing = this.app.vault.getAbstractFileByPath(outputPath);
    if (existing instanceof TFile) {
      const existingText = await this.app.vault.read(existing);
      if (existingText.includes(hashMarker)) {
        new Notice(this.text.notices.duplicateSummary);
        return;
      }
    }
    const tags = classifyTags(input.text);
    new Notice(this.text.notices.sendingSummary);
    const summary = await this.callAIProvider(this.buildSummaryPrompt(input.text, tags));
    if (!summary) return;
    const normalizedSummary = normalizeSummaryMarkdown(summary, tags, this.text);
    const block = [
      "",
      hashMarker,
      `${this.text.summary.sourceLine}: [[${input.file.path.replace(/\.md$/, "")}]]`,
      `${this.text.summary.createdLine}: ${new Date().toISOString()}`,
      "",
      normalizedSummary,
      "",
    ].join("\n");
    if (existing instanceof TFile) {
      const existingText = await this.app.vault.read(existing);
      await this.app.vault.modify(existing, existingText.trimEnd() + "\n\n" + block.trimStart());
    } else {
      await ensureFolder(this.app, "ChatGPT");
      await this.app.vault.create(outputPath, `# ${outputPath.replace(/^ChatGPT\//, "").replace(/\.md$/, "")}\n${block}`);
    }
    new Notice(`${this.text.notices.savedSummary}${outputPath}`);
  }
}

class ChatGPTBridgeSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    const text = this.plugin.text;
    containerEl.empty();
    containerEl.createEl("h2", { text: text.settings.title });

    new Setting(containerEl)
      .setName(text.settings.languageName)
      .setDesc(text.settings.languageDesc)
      .addDropdown((dropdown) =>
        dropdown
          .addOption("zh", text.settings.zh)
          .addOption("en", text.settings.en)
          .setValue(this.plugin.settings.language || DEFAULT_SETTINGS.language)
          .onChange(async (value) => {
            this.plugin.settings.language = value;
            await this.plugin.saveSettings();
            new Notice(this.plugin.text.settings.reloadNotice);
            this.display();
          }),
      );

    new Setting(containerEl)
      .setName(text.settings.bridgeFolderName)
      .setDesc(text.settings.bridgeFolderDesc)
      .addText((text) =>
        text
          .setPlaceholder("_chatgpt_bridge")
          .setValue(this.plugin.settings.bridgeFolder)
          .onChange(async (value) => {
            this.plugin.settings.bridgeFolder = value.trim() || DEFAULT_SETTINGS.bridgeFolder;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(text.settings.includeBacklinksName)
      .setDesc(text.settings.includeBacklinksDesc)
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.includeBacklinks).onChange(async (value) => {
          this.plugin.settings.includeBacklinks = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(text.settings.appendHeadingName)
      .setDesc(text.settings.appendHeadingDesc)
      .addText((text) =>
        text.setValue(this.plugin.settings.appendHeading).onChange(async (value) => {
          this.plugin.settings.appendHeading = value.trim() || DEFAULT_SETTINGS.appendHeading;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(text.settings.apiKeyName)
      .setDesc(text.settings.apiKeyDesc)
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.openaiApiKey || "")
          .onChange(async (value) => {
            this.plugin.settings.openaiApiKey = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(text.settings.baseUrlName)
      .setDesc(text.settings.baseUrlDesc)
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.openaiBaseUrl)
          .setValue(this.plugin.settings.openaiBaseUrl || DEFAULT_SETTINGS.openaiBaseUrl)
          .onChange(async (value) => {
            this.plugin.settings.openaiBaseUrl = value.trim() || DEFAULT_SETTINGS.openaiBaseUrl;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(text.settings.modelName)
      .setDesc(text.settings.modelDesc)
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.openaiModel)
          .setValue(this.plugin.settings.openaiModel || DEFAULT_SETTINGS.openaiModel)
          .onChange(async (value) => {
            this.plugin.settings.openaiModel = value.trim() || DEFAULT_SETTINGS.openaiModel;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(text.settings.apiModeName)
      .setDesc(text.settings.apiModeDesc)
      .addDropdown((dropdown) =>
        dropdown
          .addOption("chat_completions", "Chat Completions (/chat/completions)")
          .addOption("responses", "Responses (/responses)")
          .setValue(this.plugin.settings.openaiApiMode || DEFAULT_SETTINGS.openaiApiMode)
          .onChange(async (value) => {
            this.plugin.settings.openaiApiMode = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(text.settings.localMcpEnabledName)
      .setDesc(text.settings.localMcpEnabledDesc)
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.localMcpEnabled).onChange(async (value) => {
          this.plugin.settings.localMcpEnabled = value;
          await this.plugin.saveSettings();
          if (value) {
            try {
              await this.plugin.startLocalMcpServer();
            } catch {
              this.plugin.settings.localMcpEnabled = false;
              await this.plugin.saveSettings();
            }
          } else {
            await this.plugin.stopLocalMcpServer();
          }
          this.display();
        }),
      );

    new Setting(containerEl)
      .setName(text.settings.localMcpPortName)
      .setDesc(text.settings.localMcpPortDesc)
      .addText((input) =>
        input
          .setPlaceholder(String(DEFAULT_SETTINGS.localMcpPort))
          .setValue(String(this.plugin.settings.localMcpPort || DEFAULT_SETTINGS.localMcpPort))
          .onChange(async (value) => {
            const port = Number(value.trim());
            this.plugin.settings.localMcpPort =
              Number.isInteger(port) && port > 0 && port <= 65535 ? port : DEFAULT_SETTINGS.localMcpPort;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(text.settings.localMcpTokenName)
      .setDesc(text.settings.localMcpTokenDesc)
      .addText((input) => {
        input.inputEl.type = "password";
        input
          .setValue(this.plugin.settings.localMcpToken || "")
          .onChange(async (value) => {
            this.plugin.settings.localMcpToken = value.trim() || randomToken();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(text.settings.copyMcpConfigName)
      .setDesc(`${text.settings.copyMcpConfigDesc} ${this.plugin.localMcpUrl()}`)
      .addButton((button) =>
        button
          .setButtonText(text.settings.copyMcpConfigButton)
          .onClick(async () => {
            await this.plugin.copyLocalMcpConfig();
          }),
      );
  }
}
