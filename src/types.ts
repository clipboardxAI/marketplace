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

/** Fields that live in a single action file (id/category are derived from path). */
export const ACTION_FIELDS = [
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

export type ActionField = (typeof ACTION_FIELDS)[number];

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
