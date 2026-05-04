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
  bridgeFolder: "_chatgpt_bridge",
  includeFrontmatter: true,
  includeBacklinks: true,
  appendHeading: "ChatGPT Response",
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
  openaiBaseUrl: "https://api.openai.com/v1",
  openaiApiMode: "chat_completions",
};

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

function slugify(value) {
  return value
    .replace(/[\\/:*?"<>|#^[\]]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "note";
}

function todayPath() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `ChatGPT/${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.md`;
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

function normalizeSummaryMarkdown(summary, tags) {
  const trimmed = (summary || "").trim();
  const required = ["## 问题", "## 核心结论", "## 可执行步骤", "## Tags"];
  const hasAllSections = required.every((heading) => trimmed.includes(heading));
  if (!hasAllSections) {
    return [
      "## 问题",
      "需要对所选内容或当前笔记进行理解、提炼和整理。",
      "",
      "## 核心结论",
      trimmed || "OpenAI 未返回可用摘要。",
      "",
      "## 可执行步骤",
      "- 复核上面的摘要是否符合原文。",
      "- 根据需要补充下一步行动。",
      "",
      "## Tags",
      tags.join(" "),
    ].join("\n");
  }
  const [beforeTags, afterTags = ""] = trimmed.split("## Tags");
  const existingTags = new Set((afterTags.match(/#[\p{L}\p{N}_/-]+/gu) || []));
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
  constructor(app, title, placeholder, onSubmit) {
    super(app);
    this.title = title;
    this.placeholder = placeholder;
    this.onSubmit = onSubmit;
    this.value = "";
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: this.title });
    const textarea = contentEl.createEl("textarea", {
      cls: "chatgpt-bridge-textarea",
      attr: { placeholder: this.placeholder },
    });
    textarea.addEventListener("input", (event) => {
      this.value = event.target.value;
    });
    new Setting(contentEl)
      .addButton((button) =>
        button
          .setButtonText("Create request")
          .setCta()
          .onClick(async () => {
            await this.onSubmit(this.value.trim());
            this.close();
          })
      )
      .addButton((button) =>
        button
          .setButtonText("Cancel")
          .onClick(() => this.close())
      );
    textarea.focus();
  }

  onClose() {
    this.contentEl.empty();
  }
}

module.exports = class ChatGPTBridgePlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new ChatGPTBridgeSettingTab(this.app, this));

    this.addCommand({
      id: "export-active-note-context",
      name: "Export active note context",
      callback: () => this.exportActiveNoteContext(),
    });

    this.addCommand({
      id: "create-request-from-active-note",
      name: "Create ChatGPT request from active note",
      callback: () => this.createRequestFromActiveNote(),
    });

    this.addCommand({
      id: "import-latest-reply-into-active-note",
      name: "Append latest bridge reply to active note",
      callback: () => this.appendLatestReplyToActiveNote(),
    });

    this.addCommand({
      id: "create-note-from-latest-reply",
      name: "Create note from latest bridge reply",
      callback: () => this.createNoteFromLatestReply(),
    });

    this.addCommand({
      id: "open-bridge-index",
      name: "Open bridge index",
      callback: () => this.openBridgeIndex(),
    });

    this.addCommand({
      id: "ai-summarize-selection-to-daily-note",
      name: "AI summarize selection/current note to daily note",
      callback: () => this.aiSummarizeSelectionToDailyNote(),
    });

    await this.ensureBridgeIndex();
  }

  onunload() {}

  async saveSettings() {
    await this.saveData(this.settings);
  }

  getActiveMarkdownFile() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      new Notice("Open a Markdown note first.");
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
        if (links[file.path]) backlinks.push(source);
      }
    }

    return {
      exportedAt: new Date().toISOString(),
      vaultName: this.app.vault.getName(),
      file: {
        path: file.path,
        basename: file.basename,
        name: file.name,
      },
      frontmatter: this.settings.includeFrontmatter ? (cache.frontmatter || {}) : {},
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
    const tags = context.tags.length ? context.tags.join(", ") : "none";
    const backlinks = context.backlinks.length ? context.backlinks.map((item) => `- [[${item.replace(/\.md$/, "")}]]`).join("\n") : "- none";
    const headings = context.headings.length ? context.headings.map((item) => `${"  ".repeat(Math.max(0, item.level - 1))}- ${item.heading}`).join("\n") : "- none";
    return [
      "---",
      "generated_by: chatgpt-bridge",
      `source_note: "${context.file.path.replace(/"/g, '\\"')}"`,
      `exported_at: "${context.exportedAt}"`,
      "---",
      "",
      `# ChatGPT Context: ${context.file.basename}`,
      "",
      `Source: [[${context.file.path.replace(/\.md$/, "")}]]`,
      "",
      `Tags: ${tags}`,
      "",
      "## Headings",
      "",
      headings,
      "",
      "## Backlinks",
      "",
      backlinks,
      "",
      "## Content",
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
    new Notice("Exported active note context for ChatGPT.");
  }

  async createRequestFromActiveNote() {
    const file = this.getActiveMarkdownFile();
    if (!file) return;
    new PromptModal(
      this.app,
      "Create ChatGPT request",
      "What should ChatGPT/Codex do with this note?",
      async (prompt) => {
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
          prompt || "Please help with this note.",
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
        new Notice(`Created bridge request: ${path}`);
      }
    ).open();
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
      new Notice(`No reply found in ${this.settings.bridgeFolder}/replies.`);
      return;
    }
    const replyContent = await this.app.vault.read(reply);
    const current = await this.app.vault.read(target);
    const section = [
      "",
      `## ${this.settings.appendHeading} (${new Date().toLocaleString()})`,
      "",
      `Source reply: [[${reply.path.replace(/\.md$/, "")}]]`,
      "",
      replyContent,
      "",
    ].join("\n");
    await this.app.vault.modify(target, current.trimEnd() + "\n" + section);
    new Notice("Appended latest ChatGPT bridge reply.");
  }

  async createNoteFromLatestReply() {
    const reply = await this.latestReplyFile();
    if (!reply) {
      new Notice(`No reply found in ${this.settings.bridgeFolder}/replies.`);
      return;
    }
    const replyContent = await this.app.vault.read(reply);
    const path = `${this.settings.bridgeFolder}/imported/${nowStamp()}-${slugify(reply.basename)}.md`;
    await writeFile(this.app, path, replyContent);
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) await this.app.workspace.getLeaf(true).openFile(file);
    new Notice(`Created note from latest reply: ${path}`);
  }

  async ensureBridgeIndex() {
    const folder = this.settings.bridgeFolder;
    await ensureFolder(this.app, `${folder}/context`);
    await ensureFolder(this.app, `${folder}/requests`);
    await ensureFolder(this.app, `${folder}/replies`);
    await ensureFolder(this.app, `${folder}/imported`);
    const readme = `${folder}/README.md`;
    if (!this.app.vault.getAbstractFileByPath(readme)) {
      await writeFile(this.app, readme, [
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
        "No network API token is stored by this plugin.",
        "",
      ].join("\n"));
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
    const selected = view && view.editor ? view.editor.getSelection() : "";
    const text = selected && selected.trim() ? selected : await this.app.vault.read(file);
    if (!text.trim()) {
      new Notice("No text found to summarize.");
      return null;
    }
    return { file, text };
  }

  buildSummaryPrompt(text, tags) {
    return [
      "请把下面的内容总结成结构化 Markdown。",
      "必须严格使用以下格式，不要添加额外一级标题：",
      "",
      "## 问题",
      "...",
      "",
      "## 核心结论",
      "...",
      "",
      "## 可执行步骤",
      "...",
      "",
      "## Tags",
      tags.join(" "),
      "",
      "要求：",
      "- 使用中文。",
      "- Tags 部分必须包含给定 tags，可以补充 1-3 个相关 tag。",
      "- 可执行步骤要具体、可落地。",
      "",
      "原始内容：",
      text,
    ].join("\n");
  }

  async callAIProvider(prompt) {
    if (!this.settings.openaiApiKey) {
      new Notice("Set API key in ChatGPT Bridge settings first.");
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
        apiMode === "responses" ? "/responses" : "/chat/completions"
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
      new Notice(`AI API error: ${message}`);
      return null;
    }
    const data = response.json || JSON.parse(response.text);
    const chatText = data.choices?.[0]?.message?.content;
    if (chatText) return chatText.trim();
    if (data.output_text) return data.output_text.trim();
    const text = (data.output || [])
      .flatMap((item) => item.content || [])
      .filter((item) => item.type === "output_text" && item.text)
      .map((item) => item.text)
      .join("\n")
      .trim();
    return text || null;
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
        new Notice("This text has already been summarized in today's ChatGPT note.");
        return;
      }
    }
    const tags = classifyTags(input.text);
    new Notice("Sending text to AI provider for summary...");
    const summary = await this.callAIProvider(this.buildSummaryPrompt(input.text, tags));
    if (!summary) return;
    const normalizedSummary = normalizeSummaryMarkdown(summary, tags);
    const block = [
      "",
      hashMarker,
      `Source: [[${input.file.path.replace(/\.md$/, "")}]]`,
      `Created: ${new Date().toISOString()}`,
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
    new Notice(`AI summary saved to ${outputPath}`);
  }
};

class ChatGPTBridgeSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "ChatGPT Bridge" });

    new Setting(containerEl)
      .setName("Bridge folder")
      .setDesc("Vault-relative folder for context exports, requests, replies, and imported notes.")
      .addText((text) =>
        text
          .setPlaceholder("_chatgpt_bridge")
          .setValue(this.plugin.settings.bridgeFolder)
          .onChange(async (value) => {
            this.plugin.settings.bridgeFolder = value.trim() || DEFAULT_SETTINGS.bridgeFolder;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Include backlinks")
      .setDesc("Include notes that link to the active note in exported context.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.includeBacklinks)
          .onChange(async (value) => {
            this.plugin.settings.includeBacklinks = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Append heading")
      .setDesc("Heading used when appending a reply to the active note.")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.appendHeading)
          .onChange(async (value) => {
            this.plugin.settings.appendHeading = value.trim() || DEFAULT_SETTINGS.appendHeading;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("AI API key")
      .setDesc("Used only by the AI summary command. Stored in this plugin's local data.json.")
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
      .setName("AI base URL")
      .setDesc("OpenAI-compatible API base URL, such as https://api.openai.com/v1 or a third-party /v1 endpoint.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.openaiBaseUrl)
          .setValue(this.plugin.settings.openaiBaseUrl || DEFAULT_SETTINGS.openaiBaseUrl)
          .onChange(async (value) => {
            this.plugin.settings.openaiBaseUrl = value.trim() || DEFAULT_SETTINGS.openaiBaseUrl;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("AI model")
      .setDesc("Model used for AI summaries. Use the model name required by your provider.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.openaiModel)
          .setValue(this.plugin.settings.openaiModel || DEFAULT_SETTINGS.openaiModel)
          .onChange(async (value) => {
            this.plugin.settings.openaiModel = value.trim() || DEFAULT_SETTINGS.openaiModel;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("AI API mode")
      .setDesc("Use Chat Completions for most OpenAI-compatible providers. Use Responses for OpenAI Responses API.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("chat_completions", "Chat Completions (/chat/completions)")
          .addOption("responses", "Responses (/responses)")
          .setValue(this.plugin.settings.openaiApiMode || DEFAULT_SETTINGS.openaiApiMode)
          .onChange(async (value) => {
            this.plugin.settings.openaiApiMode = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
