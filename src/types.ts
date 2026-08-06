// Shared types & constants for the Clipboard x AI Action Marketplace build tool.
//
// The marketplace catalog (`marketplace.json`) is the artifact the desktop app
// fetches. This tool aggregates one-JSON-per-action source files (organized by
// category directory) plus per-language overrides under `i18n/<lang>/`, and
// validates the result.

/** Catalog schema version. Bump only on breaking changes to the output shape. */
export const SCHEMA_VERSION = 1;

/**
 * Locales the desktop app supports. Raw values mirror `AppLanguage` in the app
 * (ClipboardXAI/Core/Shared/I18n/AppLanguage.swift). Any `<lang>` directory
 * under `i18n/` MUST be one of these, otherwise validation fails.
 *
 * The app currently ships 25 locale codes (the user-facing "23+ languages").
 */
export const SUPPORTED_LOCALES: readonly string[] = [
  "en",
  "zh-CN",
  "zh-TW",
  "da",
  "de",
  "de-CH",
  "el",
  "es",
  "fi",
  "fr",
  "hi",
  "hu",
  "id",
  "it",
  "ja",
  "ko",
  "ms",
  "nl",
  "no",
  "pt",
  "ru",
  "th",
  "tr",
  "uk",
  "vi",
];

export const VALID_TYPES = new Set([
  "text",
  "url",
  "image",
  "file",
  "code",
  "json",
  "email",
]);

export const VALID_OUTPUT_MODES = new Set(["copy", "openPanel"]);

/** Valid values for an action's `execution.kind`. */
export const VALID_EXECUTION_KINDS = new Set(["externalApp"]);

/** Fields required in every action file (id/category are derived from path). */
export const REQUIRED_ACTION_FIELDS = [
  "name",
  "icon",
  "author",
  "version",
  "description",
  "tags",
  "prompt",
  "appliesTo",
  "outputMode",
  "minAppVersion",
] as const;

/** All fields allowed in an action file (required + optional / ecosystem). */
export const ACTION_FIELDS = [
  ...REQUIRED_ACTION_FIELDS,
  // Phase 7 — Ecosystem / external-app delegation (v3.0, all optional):
  "appIcon", // 打包的伙伴 App 品牌图标（网站端渲染用，相对 icons/ 目录）
  "appStoreURL", // App Store / 官网下载链接（未安装时引导下载）
  "appDownloadURL", // 可选：非 App Store 的直接下载链接
  "execution", // 外部 App 委派：{ kind, scheme, urlTemplate }
] as const;

export type ActionField = (typeof ACTION_FIELDS)[number];

/**
 * 外部 App 委派描述（v3.0 生态动作）。
 * 不直接在 ClipboardXAI 内执行，而是用 NSWorkspace.open 拉起已安装的兄弟 App，
 * 并把当前条目（文件 / 文本）填进它的 deeplink。
 */
export interface ExecutionSpec {
  /** 必须为 "externalApp"（其余类型预留）。 */
  kind: string;
  /** 目标 App 的 URL scheme（如 "nuezip" / "nicasa"）。 */
  scheme?: string;
  /** deeplink 模板，含 {{files}} / {{text}} / {{returnURL}} 变量。 */
  urlTemplate?: string;
}

/** A translatable subset of an action — what `i18n/<lang>/...` files may carry. */
export interface ActionOverride {
  name?: string;
  description?: string;
  prompt?: string;
  tags?: string[];
}

/** The full, path-derived action entry written into the catalog. */
export interface ActionEntry extends ActionOverride {
  id: string;
  category: string;
  icon: string;
  author: string;
  version: string;
  appliesTo: string[];
  outputMode: string;
  minAppVersion: string;
  // Phase 7 — Ecosystem / external-app delegation (v3.0):
  appIcon?: string;
  appStoreURL?: string;
  appDownloadURL?: string;
  execution?: ExecutionSpec;
  locales?: Record<string, ActionOverride>;
}

export interface CategoryEntry {
  id: string;
  name: string;
  icon: string;
  locales?: Record<string, { name?: string }>;
}

export interface Catalog {
  schemaVersion: number;
  catalogVersion: string;
  updatedAt: string;
  categories: CategoryEntry[];
  actions: ActionEntry[];
}
