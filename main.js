const {
  App,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  requestUrl,
  Setting,
  TFile,
} = require("obsidian");
const crypto = require("crypto");

const DEFAULT_SETTINGS = {
  language: "zh",
  bridgeFolder: "_chatgpt_bridge",
  includeFrontmatter: true,
  includeBacklinks: true,
  appendHeading: "ChatGPT Response",
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
  openaiBaseUrl: "https://api.openai.com/v1",
  openaiApiMode: "chat_completions",
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
    },
    promptModal: {
      title: "创建 ChatGPT 请求",
      placeholder: "希望 ChatGPT/Codex 对这篇笔记做什么？",
      fallbackPrompt: "请帮助处理这篇笔记。",
    },
    context: {
      noItems: "无",
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
    },
    promptModal: {
      title: "Create ChatGPT request",
      placeholder: "What should ChatGPT/Codex do with this note?",
      fallbackPrompt: "Please help with this note.",
    },
    context: {
      noItems: "none",
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

function joinUrl(baseUrl, path) {
  const base = (baseUrl || DEFAULT_SETTINGS.openaiBaseUrl).trim().replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
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
  
  get text() {
    return TEXT[this.settings.language || DEFAULT_SETTINGS.language];
  }

  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
  }

  async saveSettings() {
    await this.saveData(this.settings);
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
      `# ChatGPT Context: ${context.file.basename}`,
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
        "# ChatGPT Request",
        "",
        prompt || text.promptModal.fallbackPrompt,
        "",
        "## Source Note",
        "",
        `[[${file.path.replace(/\.md$/, "")}]]`,
        "",
        "## Context",
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
  }
}
