// Core catalog assembly & validation logic for the marketplace build tool.
//
// Layout (all paths relative to the repo root):
//   actions/<category>/<id>.json   base (canonical, English) action definition
//   categories.json                 category metadata (order = sidebar order)
//   i18n/<lang>/<category>/<id>.json   per-action locale overrides
//   i18n/<lang>/categories.json        per-category name overrides
//   marketplace.json               generated artifact (committed, served by Pages)

import fs from "node:fs";
import path from "node:path";

import {
  ACTION_FIELDS,
  REQUIRED_ACTION_FIELDS,
  SCHEMA_VERSION,
  SUPPORTED_LOCALES,
  VALID_EXECUTION_KINDS,
  VALID_OUTPUT_MODES,
  VALID_TYPES,
  type ActionEntry,
  type ActionOverride,
  type Catalog,
  type CategoryEntry,
  type ExecutionSpec,
} from "./types.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ACTIONS_DIR = path.join(ROOT, "actions");
const I18N_DIR = path.join(ROOT, "i18n");
const CATEGORIES_FILE = path.join(ROOT, "categories.json");
const OUTPUT_FILE = path.join(ROOT, "marketplace.json");

const SUPPORTED_LOCALE_SET = new Set(SUPPORTED_LOCALES);
const OVERRIDE_KEYS = new Set(["name", "description", "prompt", "tags"]);

export function die(msg: string): never {
  process.stderr.write("❌ " + msg + "\n");
  process.exit(1);
}

function loadJSON(file: string): any {
  let raw: string;
  try {
    raw = fs.readFileSync(file, "utf-8");
  } catch {
    return die("File not found: " + file);
  }
  try {
    return JSON.parse(raw);
  } catch (e: any) {
    return die("JSON parse failed " + file + ": " + e.message);
  }
}

function loadCategories(): { ids: string[]; cats: CategoryEntry[] } {
  if (!fs.existsSync(CATEGORIES_FILE)) die("Missing categories.json: " + CATEGORIES_FILE);
  const data = loadJSON(CATEGORIES_FILE);
  const cats = data?.categories;
  if (!Array.isArray(cats) || cats.length === 0) die("categories.json must contain a non-empty `categories` array");
  const ids: string[] = [];
  for (const c of cats) {
    if (!c?.id) die("categories.json has a category without `id`");
    ids.push(c.id);
  }
  return { ids, cats: cats as CategoryEntry[] };
}

interface ActionFileRef {
  file: string;
  category: string;
  id: string;
}

function iterActionFiles(): ActionFileRef[] {
  if (!fs.existsSync(ACTIONS_DIR)) die("Missing actions/ directory: " + ACTIONS_DIR);
  const out: ActionFileRef[] = [];
  for (const cat of fs.readdirSync(ACTIONS_DIR).sort()) {
    const catDir = path.join(ACTIONS_DIR, cat);
    if (!fs.statSync(catDir).isDirectory()) continue;
    for (const fn of fs.readdirSync(catDir).sort()) {
      if (!fn.endsWith(".json")) continue;
      out.push({ file: path.join(catDir, fn), category: cat, id: fn.slice(0, -".json".length) });
    }
  }
  return out;
}

function semverLike(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const parts = v.split(".");
  if (parts.length !== 3) return false;
  return parts.every((p) => /^\d+$/.test(p));
}

function validateAction(
  data: any,
  category: string,
  id: string,
  validCategories: Set<string>,
): string[] {
  const errors: string[] = [];
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return ["Action " + id + " is not a JSON object"];
  }
  const keys = Object.keys(data);
  const missing = REQUIRED_ACTION_FIELDS.filter((f) => !(f in data));
  if (missing.length) errors.push("Action " + id + " missing fields: " + missing.join(", "));
  const extra = keys.filter((k) => !(ACTION_FIELDS as readonly string[]).includes(k));
  if (extra.length) errors.push("Action " + id + " has unknown fields: " + extra.join(", "));

  if ("name" in data && typeof data.name !== "string") errors.push("Action " + id + ".name must be a string");
  if ("icon" in data && typeof data.icon !== "string") errors.push("Action " + id + ".icon must be a string");
  if ("author" in data && typeof data.author !== "string") errors.push("Action " + id + ".author must be a string");
  if ("description" in data && typeof data.description !== "string")
    errors.push("Action " + id + ".description must be a string");
  if ("prompt" in data && typeof data.prompt !== "string") errors.push("Action " + id + ".prompt must be a string");

  if ("tags" in data) {
    if (!Array.isArray(data.tags) || !data.tags.every((t: any) => typeof t === "string"))
      errors.push("Action " + id + ".tags must be string[]");
  }
  if ("appliesTo" in data) {
    if (!Array.isArray(data.appliesTo)) {
      errors.push("Action " + id + ".appliesTo must be an array");
    } else {
      for (const t of data.appliesTo) {
        if (!VALID_TYPES.has(t))
          errors.push(
            "Action " + id + ".appliesTo has invalid type '" + t + "' (allowed: " + [...VALID_TYPES].join(", ") + ")",
          );
      }
    }
  }
  if ("outputMode" in data && !VALID_OUTPUT_MODES.has(data.outputMode))
    errors.push("Action " + id + ".outputMode must be one of " + [...VALID_OUTPUT_MODES].join("/"));

  // Phase 7 — Ecosystem / external-app delegation.
  for (const optStr of ["appIcon", "appStoreURL", "appDownloadURL"] as const) {
    if (optStr in data && typeof data[optStr] !== "string")
      errors.push("Action " + id + "." + optStr + " must be a string");
  }
  if ("execution" in data) {
    const ex = data.execution;
    if (typeof ex !== "object" || ex === null || Array.isArray(ex)) {
      errors.push("Action " + id + ".execution must be an object");
    } else {
      if (typeof ex.kind !== "string" || !VALID_EXECUTION_KINDS.has(ex.kind)) {
        errors.push(
          "Action " + id + ".execution.kind must be one of " + [...VALID_EXECUTION_KINDS].join(", "),
        );
      }
      if (ex.kind === "externalApp") {
        if (typeof ex.scheme !== "string" || ex.scheme.length === 0)
          errors.push("Action " + id + ".execution.scheme is required for externalApp");
        if (typeof ex.urlTemplate !== "string" || ex.urlTemplate.length === 0)
          errors.push("Action " + id + ".execution.urlTemplate is required for externalApp");
      }
    }
  }
  for (const vkey of ["version", "minAppVersion"]) {
    if (vkey in data && data[vkey] !== null && data[vkey] !== undefined && !semverLike(data[vkey]))
      errors.push("Action " + id + "." + vkey + " must be a x.y.z version, got: " + JSON.stringify(data[vkey]));
  }
  if (!validCategories.has(category))
    errors.push(
      "Action " + id + " lives under unknown category '" + category + "' (allowed: " + [...validCategories].join(", ") + ")",
    );
  return errors;
}

/** Load every per-language override file into a structured map. */
interface LocaleIndex {
  // category id -> lang -> { name }
  categories: Record<string, Record<string, { name?: string }>>;
  // "<category>/<id>" -> lang -> ActionOverride
  actions: Record<string, Record<string, ActionOverride>>;
}

function loadLocales(validCategoryIds: Set<string>, validActionKeys: Set<string>): LocaleIndex {
  const index: LocaleIndex = { categories: {}, actions: {} };
  if (!fs.existsSync(I18N_DIR)) return index;

  for (const lang of fs.readdirSync(I18N_DIR).sort()) {
    const langDir = path.join(I18N_DIR, lang);
    if (!fs.statSync(langDir).isDirectory()) continue;
    if (!SUPPORTED_LOCALE_SET.has(lang)) {
      die("Unsupported locale directory i18n/" + lang + " (allowed: " + SUPPORTED_LOCALES.join(", ") + ")");
    }
    for (const entry of fs.readdirSync(langDir).sort()) {
      const entryPath = path.join(langDir, entry);
      if (!fs.statSync(entryPath).isDirectory()) {
        // Expect categories.json at this level.
        if (entry !== "categories.json") {
          die("Unexpected file i18n/" + lang + "/" + entry + " (only categories.json or <category>/ dirs allowed)");
        }
        const map = loadJSON(entryPath);
        if (typeof map !== "object" || map === null) die("i18n/" + lang + "/categories.json must be an object");
        for (const [cid, val] of Object.entries(map)) {
          if (!validCategoryIds.has(cid)) die("i18n/" + lang + "/categories.json references unknown category '" + cid + "'");
          const override: { name?: string } = {};
          if (typeof val === "string") {
            override.name = val;
          } else if (val && typeof val === "object") {
            if ("name" in (val as any)) {
              if (typeof (val as any).name !== "string") die("i18n/" + lang + "/categories.json[" + cid + "].name must be a string");
              override.name = (val as any).name;
            }
          }
          (index.categories[cid] ??= {})[lang] = override;
        }
        continue;
      }
      // <category>/<id>.json
      const cat = entry;
      if (!validCategoryIds.has(cat)) die("i18n/" + lang + "/" + cat + " is not a known category directory");
      const catDir = entryPath;
      for (const fn of fs.readdirSync(catDir).sort()) {
        if (!fn.endsWith(".json")) continue;
        const id = fn.slice(0, -".json".length);
        const key = cat + "/" + id;
        if (!validActionKeys.has(key)) die("i18n/" + lang + "/" + cat + "/" + fn + " has no matching action (expected actions/" + cat + "/" + fn + ")");
        const data = loadJSON(path.join(catDir, fn));
        if (typeof data !== "object" || data === null) die("i18n/" + lang + "/" + cat + "/" + fn + " must be a JSON object");
        const override: ActionOverride = {};
        for (const k of Object.keys(data)) {
          if (!OVERRIDE_KEYS.has(k)) die("i18n/" + lang + "/" + cat + "/" + fn + " has unknown field '" + k + "' (allowed: name, description, prompt, tags)");
          (override as any)[k] = data[k];
        }
        (index.actions[key] ??= {})[lang] = override;
      }
    }
  }
  return index;
}

function buildCatalog(): Catalog {
  const { ids, cats } = loadCategories();
  const validCategories = new Set(ids);

  const actionRefs = iterActionFiles();
  const validActionKeys = new Set(actionRefs.map((r) => r.category + "/" + r.id));

  const seen = new Map<string, string>();
  const actions: ActionEntry[] = [];
  const problems: string[] = [];

  for (const ref of actionRefs) {
    const data = loadJSON(ref.file);
    // id/category are path-derived; never trust copies inside the file.
    delete data.id;
    delete data.category;
    delete data.locales;
    const errs = validateAction(data, ref.category, ref.id, validCategories);
    problems.push(...errs);
    if (seen.has(ref.id)) {
      die("Duplicate action id '" + ref.id + "' (" + seen.get(ref.id) + " and " + ref.file + ")");
    }
    seen.set(ref.id, ref.file);

    const entry: ActionEntry = {
      id: ref.id,
      category: ref.category,
      name: data.name,
      icon: data.icon,
      author: data.author,
      version: data.version,
      description: data.description,
      tags: data.tags,
      prompt: data.prompt,
      appliesTo: data.appliesTo,
      outputMode: data.outputMode,
      minAppVersion: data.minAppVersion,
    };
    // Phase 7 — Ecosystem / external-app delegation (carried through only when present).
    if ("appIcon" in data) entry.appIcon = data.appIcon;
    if ("appStoreURL" in data) entry.appStoreURL = data.appStoreURL;
    if ("appDownloadURL" in data) entry.appDownloadURL = data.appDownloadURL;
    if ("execution" in data) entry.execution = data.execution as ExecutionSpec;
    actions.push(entry);
  }

  const locales = loadLocales(validCategories, validActionKeys);
  for (const a of actions) {
    const ov = locales.actions[a.category + "/" + a.id];
    if (ov && Object.keys(ov).length) a.locales = ov;
  }
  const categories: CategoryEntry[] = cats.map((c) => {
    const ov = locales.categories[c.id];
    return ov && Object.keys(ov).length ? { ...c, locales: ov } : c;
  });

  if (problems.length) {
    for (const p of problems) process.stderr.write("❌ " + p + "\n");
    die("Validation failed. Fix the issues above, then rebuild.");
  }

  const catIndex = new Map(ids.map((id, i) => [id, i]));
  actions.sort((a, b) => {
    const ca = catIndex.get(a.category) ?? 999;
    const cb = catIndex.get(b.category) ?? 999;
    return ca !== cb ? ca - cb : a.id.localeCompare(b.id);
  });

  const today = new Date();
  const ymd = today.toISOString().slice(0, 10);
  const stamp = (n: number) => String(n).padStart(2, "0");
  const versionStamp = today.getFullYear() + "." + stamp(today.getMonth() + 1) + "." + stamp(today.getDate());

  return {
    schemaVersion: SCHEMA_VERSION,
    catalogVersion: process.env.CATALOG_VERSION ?? versionStamp,
    updatedAt: process.env.UPDATED_AT ?? ymd,
    categories,
    actions,
  };
}

function normalize(catalog: Catalog): string {
  return stableStringify(catalog);
}

/** Deterministic stringify (sorted keys) so equality compares semantics, not key order. */
function stableStringify(value: any): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") + "}";
}

function writeCatalog(catalog: Catalog): void {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(catalog, null, 2) + "\n", "utf-8");
  process.stdout.write(
    "✅ Wrote " + OUTPUT_FILE + " (" + catalog.categories.length + " categories / " + catalog.actions.length + " actions)\n",
  );
}

export function cmdBuild(): void {
  writeCatalog(buildCatalog());
}

export function cmdSplit(): void {
  if (!fs.existsSync(OUTPUT_FILE)) die("split requires an existing marketplace.json");
  const catalog = loadJSON(OUTPUT_FILE) as Catalog;
  if (!fs.existsSync(ACTIONS_DIR)) fs.mkdirSync(ACTIONS_DIR, { recursive: true });
  for (const a of catalog.actions ?? []) {
    const cat = a.category;
    const id = a.id;
    if (!cat || !id) die("marketplace.json has an action without category/id");
    const dir = path.join(ACTIONS_DIR, cat);
    fs.mkdirSync(dir, { recursive: true });
    const entry: Record<string, any> = {};
    for (const f of ACTION_FIELDS) if (f in a) entry[f] = (a as any)[f];
    fs.writeFileSync(path.join(dir, id + ".json"), JSON.stringify(entry, null, 2) + "\n", "utf-8");
  }
  process.stdout.write("✅ Split " + (catalog.actions ?? []).length + " actions into actions/\n");
}

export function cmdValidate(): void {
  const catalog = buildCatalog();
  if (!fs.existsSync(OUTPUT_FILE)) die("marketplace.json does not exist. Run `npm run build` first.");
  const existing = loadJSON(OUTPUT_FILE) as Catalog;
  if (normalize(existing) !== normalize(catalog)) {
    const eIds = new Map((existing.actions ?? []).map((a) => [a.id, a]));
    const nIds = new Map(catalog.actions.map((a) => [a.id, a]));
    const diffs: string[] = [];
    for (const id of [...eIds.keys()].filter((k) => !nIds.has(k))) diffs.push("removed action: " + id);
    for (const id of [...nIds.keys()].filter((k) => !eIds.has(k))) diffs.push("added action: " + id);
    for (const id of [...eIds.keys()].filter((k) => nIds.has(k))) {
      if (stableStringify(eIds.get(id)!) !== stableStringify(nIds.get(id)!)) diffs.push("changed action: " + id);
    }
    if (stableStringify(existing.categories) !== stableStringify(catalog.categories)) diffs.push("category list changed");
    for (const d of diffs) process.stderr.write("⚠️  " + d + "\n");
    die("marketplace.json is out of sync with source. Run `npm run build` and commit the result.");
  }
  process.stdout.write("✅ Validation passed — marketplace.json matches source (" + catalog.actions.length + " actions).\n");
}
