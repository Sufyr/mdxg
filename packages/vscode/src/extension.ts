import * as vscode from "vscode";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { parseMarkdown, Page } from "./parser";
import { getWebviewContent, Mode, SidebarState } from "./webview";

class MdxgEditorProvider implements vscode.CustomTextEditorProvider {
  private static readonly viewType = "mdxg.preview";

  private pageIndexByUri = new Map<string, number>();
  private pagesByUri = new Map<string, Page[]>();
  private modeByUri = new Map<string, Mode>();
  private sidebarByUri = new Map<string, SidebarState>();
  private searchByUri = new Map<string, string>();
  private suppressRefresh = new Set<string>();

  private katexCss: string;
  private mermaidJsPath: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    const katexCssPath = path.join(
      context.extensionPath,
      "node_modules",
      "katex",
      "dist",
      "katex.min.css"
    );
    try {
      this.katexCss = fs.readFileSync(katexCssPath, "utf-8");
    } catch {
      this.katexCss = "";
    }

    this.mermaidJsPath = path.join(
      context.extensionPath,
      "node_modules",
      "mermaid",
      "dist",
      "mermaid.min.js"
    );
  }

  static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MdxgEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(
      MdxgEditorProvider.viewType,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      }
    );
  }

  resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): void {
    const key = document.uri.toString();

    const docDir = vscode.Uri.joinPath(document.uri, "..");
    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, "node_modules")),
        docDir,
        ...workspaceFolders.map((wf) => wf.uri),
      ],
    };

    const mermaidUri = webviewPanel.webview.asWebviewUri(
      vscode.Uri.file(this.mermaidJsPath)
    );

    const baseUri = webviewPanel.webview.asWebviewUri(docDir);

    const refresh = () => {
      if (this.suppressRefresh.has(key)) return;

      const text = document.getText();
      const pages = parseMarkdown(text);
      this.pagesByUri.set(key, pages);

      let pageIndex = this.pageIndexByUri.get(key)
        ?? this.context.workspaceState.get<number>("mdxg.page." + key)
        ?? 0;
      if (pageIndex >= pages.length) {
        pageIndex = Math.max(0, pages.length - 1);
      }
      this.pageIndexByUri.set(key, pageIndex);

      const mode = this.modeByUri.get(key)
        ?? this.context.workspaceState.get<Mode>("mdxg.mode." + key)
        ?? "preview";
      const sidebar = this.sidebarByUri.get(key)
        ?? this.context.workspaceState.get<SidebarState>("mdxg.sidebar." + key)
        ?? { leftHidden: false, rightHidden: false };
      this.sidebarByUri.set(key, sidebar);

      if (pages.length === 0) {
        webviewPanel.webview.html = emptyState();
        return;
      }

      const searchQuery = this.searchByUri.get(key) ?? "";

      const nonce = getNonce();
      const cspSource = webviewPanel.webview.cspSource;
      webviewPanel.webview.html = getWebviewContent(
        pages,
        pageIndex,
        text,
        mode,
        sidebar,
        searchQuery,
        cspSource,
        nonce,
        this.katexCss,
        mermaidUri.toString(),
        baseUri.toString()
      );
    };

    refresh();

    const changeListener = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === key) refresh();
    });

    const messageListener = webviewPanel.webview.onDidReceiveMessage(
      async (msg) => {
        if (msg.type === "navigate" && typeof msg.index === "number") {
          const pages = this.pagesByUri.get(key) ?? [];
          const idx = Math.max(0, Math.min(msg.index, pages.length - 1));
          this.pageIndexByUri.set(key, idx);
          this.context.workspaceState.update("mdxg.page." + key, idx);
          refresh();
        } else if (msg.type === "setMode" && ["preview", "markdown", "both"].includes(msg.mode)) {
          this.modeByUri.set(key, msg.mode as Mode);
          this.context.workspaceState.update("mdxg.mode." + key, msg.mode);
          refresh();
        } else if (msg.type === "toggleSidebar") {
          const sidebar = this.sidebarByUri.get(key) ?? { leftHidden: false, rightHidden: false };
          if (msg.side === "left") sidebar.leftHidden = !sidebar.leftHidden;
          if (msg.side === "right") sidebar.rightHidden = !sidebar.rightHidden;
          this.sidebarByUri.set(key, sidebar);
          this.context.workspaceState.update("mdxg.sidebar." + key, sidebar);
          refresh();
        } else if (msg.type === "searchNavigate") {
          const pages = this.pagesByUri.get(key) ?? [];
          const idx = Math.max(0, Math.min(msg.index, pages.length - 1));
          this.pageIndexByUri.set(key, idx);
          this.context.workspaceState.update("mdxg.page." + key, idx);
          this.searchByUri.set(key, msg.query ?? "");
          refresh();
        } else if (msg.type === "updateSearch") {
          this.searchByUri.set(key, msg.query ?? "");
        } else if (msg.type === "clearSearch") {
          this.searchByUri.delete(key);
        } else if (msg.type === "openLink" && typeof msg.href === "string") {
          const dir = vscode.Uri.joinPath(document.uri, "..");
          const linkPath = msg.href.split("#")[0];
          if (linkPath.includes("..") || path.isAbsolute(linkPath)) return;
          const target = vscode.Uri.joinPath(dir, linkPath);
          const workspaceFolders = vscode.workspace.workspaceFolders;
          const inWorkspace = !workspaceFolders || workspaceFolders.some(
            (wf) => target.fsPath.startsWith(wf.uri.fsPath)
          );
          if (!inWorkspace) return;
          vscode.commands.executeCommand("vscode.openWith", target, "mdxg.preview");
        } else if (msg.type === "edit" && typeof msg.text === "string") {
          const edit = new vscode.WorkspaceEdit();
          const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
          );
          edit.replace(document.uri, fullRange, msg.text);

          this.suppressRefresh.add(key);
          try {
            await vscode.workspace.applyEdit(edit);
          } finally {
            this.suppressRefresh.delete(key);
          }
        }
      }
    );

    webviewPanel.onDidDispose(() => {
      changeListener.dispose();
      messageListener.dispose();
      this.pageIndexByUri.delete(key);
      this.pagesByUri.delete(key);
      this.modeByUri.delete(key);
      this.sidebarByUri.delete(key);
      this.searchByUri.delete(key);
      this.suppressRefresh.delete(key);
    });
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(MdxgEditorProvider.register(context));
}

function emptyState(): string {
  return `<!DOCTYPE html>
<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;
  color:var(--vscode-descriptionForeground);font-family:var(--vscode-font-family);">
  <p>No content to preview.</p>
</body></html>`;
}

function getNonce(): string {
  return crypto.randomBytes(16).toString("base64url");
}

export function deactivate() {}
