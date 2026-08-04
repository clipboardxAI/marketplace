# Clipboard x AI · Action Marketplace

This is the **action catalog repository** for [Clipboard x AI](https://github.com/w3cub/clipboardxai).

The app's in-app **Action Marketplace** window pulls an installable catalog of actions from a public JSON file. Anyone can fork this repo, add an action, and open a PR — once merged, every user can install it in one click.

- 📦 Source: `actions/<category>/<id>.json` (one file per action, organized by category directory)
- 🌐 Localization: `i18n/<lang>/<category>/<id>.json` (per-language overrides; the app supports 23+ languages)
- 🛠 Build tool: `src/` — a Node.js + TypeScript script (`npm run build`) that aggregates and validates into `marketplace.json`
- 🚀 Artifact: `marketplace.json` (served at `https://clipboard.w3cub.com/marketplace/`)
- 🔗 In-app install: the Action Marketplace window (Settings → My Actions → Action Marketplace)
- ⚡ Web one-click install: `clipboardxai://install?action=<id>` (see `index.html`)

---

## What this repository is for

Clipboard x AI lets you supercharge your clipboard with **custom actions** — a prompt template with `{{content}}` variables that you hand off to your cloud AI. The built-in actions are limited, but the community's imagination is not. This repo opens the action catalog up to community maintenance:

- Each action is a standalone `actions/<category>/<id>.json` file; the directory **is** the category.
- The TypeScript build tool aggregates and validates all action files into `marketplace.json` — that is the artifact the app fetches.
- The app fetches the deployed `marketplace.json` on launch; if it fails, it falls back to the same file bundled inside the app, so it still works offline.
- An action you "install" in the app is simply written into your local `actions.json` and flows through the exact same run/ranking pipeline as a self-made action.

---

## Repository structure

```
clipboardxai-marketplace/
├── actions/                       # Source: one JSON file per action, by category directory
│   ├── writing/                   #   directory name = category id
│   │   ├── polish-copy.json       #   file name = action id
│   │   └── ...
│   ├── dev/
│   ├── productivity/
│   ├── translate/
│   ├── social/
│   └── analysis/
├── i18n/                          # Localization overrides (one dir per locale)
│   └── zh-CN/                     #   locale code must be an app-supported language
│       ├── categories.json        #   category name overrides: { "writing": "写作润色" }
│       ├── writing/
│       │   └── polish-copy.json   #   action overrides: { "name", "description", "prompt", "tags" }
│       └── ...
├── categories.json                # Category metadata (order = sidebar order)
├── src/                           # Node.js + TypeScript build/validate tool
│   ├── index.ts
│   ├── builder.ts
│   └── types.ts
├── package.json                   # scripts: build / validate / split
├── tsconfig.json
├── marketplace.json               # Generated artifact (deployed to Pages)
├── index.html                     # Web preview + one-click install (locale-aware)
├── README.md
├── CONTRIBUTING.md
└── .github/
    ├── workflows/validate.yml     # Validates on every PR/push
    └── PULL_REQUEST_TEMPLATE.md
```

Conventions (important):

- **Action `id` = file name** (without `.json`), lowercase kebab-case, e.g. `polish-copy`. Globally unique — install / update / uninstall all match on it.
- **Action category = containing directory name**, which must be one of the ids in `categories.json`.
- These two fields are derived from the path, so **do not (and should not) repeat them inside the file** — the build tool injects them.

---

## Internationalization (i18n)

The desktop app ships **23+ languages** (locale codes such as `en`, `zh-CN`, `zh-TW`, `ja`, `de`, `fr`, `es`, `ru`, … — see `src/types.ts` → `SUPPORTED_LOCALES`). The marketplace catalog supports the same set.

- The **base** `actions/<category>/<id>.json` is the **canonical (English) definition**. Every action must have an English `name`, `description`, and `prompt`.
- Translations live under `i18n/<lang>/`. The `<lang>` directory **must** be one of the supported locale codes, or validation fails.
  - `i18n/<lang>/<category>/<id>.json` — overrides for a single action. Only these keys are allowed: `name`, `description`, `prompt`, `tags`. Any subset is fine; missing keys fall back to the English base.
  - `i18n/<lang>/categories.json` — category name overrides, as a map `categoryId → name` (a plain string) or `categoryId → { "name": "..." }`.
- The build tool merges these into each entry's `locales` map in `marketplace.json`. Example output:

```json
{
  "id": "polish-copy",
  "category": "writing",
  "name": "Polish Copy",
  "description": "Polish the selected text …",
  "prompt": "Please polish the following text …",
  "appliesTo": ["text", "code"],
  "outputMode": "copy",
  "minAppVersion": "3.0.0",
  "locales": {
    "zh-CN": {
      "name": "润色文案",
      "description": "润色选中的文本，使其更通顺、专业，保持原意。",
      "prompt": "请润色以下文本，保持原意但表达更通顺、专业、得体：\n\n{{content}}",
      "tags": ["润色", "改写", "写作"]
    }
  }
}
```

> The app currently renders the canonical (English) `name`/`description`. Wiring the app to consume the `locales` map for the user's active language is a small follow-up in the app repo (the data format is already compatible — unknown keys are ignored by the decoder).

---

## Local build (required)

Before committing, run the build tool. It aggregates, validates, and regenerates `marketplace.json` — **commit the regenerated file together with your changes**:

```bash
npm install        # first time only
npm run build      # read actions/ + categories.json (+ i18n/) → marketplace.json
npm run validate   # validate source AND confirm marketplace.json is up to date (same as CI)
```

> If you only change files under `actions/` (or `i18n/`) without regenerating `marketplace.json`, `validate` (and CI) will fail. So **always `build` before you commit**.

One-time migration (maintainers only; not needed day-to-day):

```bash
npm run split      # split an existing marketplace.json into actions/<cat>/<id>.json
```

Environment overrides for `build`:

- `CATALOG_VERSION` — overrides `catalogVersion` (default: today as `YYYY.MM.DD`)
- `UPDATED_AT` — overrides `updatedAt` (default: today as `YYYY-MM-DD`)

---

## Deploy (so the app can fetch the catalog)

The app fetches the catalog from the URL in **Settings → My Actions → Marketplace URL** (default: `https://clipboard.w3cub.com/marketplace/marketplace.json`).

The official site renders at **`https://clipboard.w3cub.com/marketplace/`** and serves the JSON data from the same directory, so the catalog, `index.html`, and all per-action `*.json` files live together. Any of the following hosting options works as long as the JSON stays reachable at that base URL.

### Option A: Official site (clipboard.w3cub.com/marketplace)

1. Build the catalog: `npm run build` (commits `marketplace.json`).
2. Upload this directory to the production path `/marketplace/` on `clipboard.w3cub.com`.
3. Verify `https://clipboard.w3cub.com/marketplace/marketplace.json` downloads and `https://clipboard.w3cub.com/marketplace/` shows the showcase page.
4. The app already defaults to this URL — no settings change needed.

### Option B: GitHub Pages (fork / preview)

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main** / **root** (root directory), then Save.
3. After a few minutes, confirm `https://<your-user>.github.io/clipboardxai-marketplace/marketplace.json` downloads.
4. In the app settings, set the Marketplace URL to that URL.

### Option C: Cloudflare Pages

1. In Cloudflare Pages, create a project and connect this repo (or upload the directory).
2. Leave the build command empty; set the build output directory to `.` (root).
3. After deploy, put the assigned `*.pages.dev` (or custom) domain into the app's Marketplace URL, including the `/marketplace.json` path.

> Every time a PR is merged and `marketplace.json` is regenerated, the host republishes automatically; users see the new actions on their next refresh.

---

## Single action file schema (`actions/<category>/<id>.json`)

> Do **not** write `id` or `category` in the file — they are derived from the file name and directory.

| Field | Type | Description |
| --- | --- | --- |
| `name` | string | Display name. **English, required.** ≤ ~8 words recommended. |
| `icon` | string | Any **SF Symbols** name, e.g. `wand.and.stars`. |
| `author` | string | Author name (your GitHub username). |
| `version` | string | Semver, e.g. `1.0.0`. Bump on update (e.g. `1.1.0`). |
| `description` | string | One-sentence description of what the action does. **English, required.** |
| `tags` | string[] | Tags for search & display (optional but recommended). |
| `prompt` | string | Prompt template. Use `{{content}}` (current clipboard text) and `{{type}}` (content type). **English, required.** |
| `appliesTo` | string[] | Applicable types: `text` `url` `image` `file` `code` `json` `email`. |
| `outputMode` | string | `copy` (write back to clipboard) or `openPanel` (show a result panel). |
| `minAppVersion` | string | Minimum app version required, e.g. `3.0.0`. |

Example (`actions/writing/polish-copy.json`):

```json
{
  "name": "Polish Copy",
  "icon": "pencil.and.outline",
  "author": "ClipboardXAI",
  "version": "1.0.0",
  "description": "Polish the selected text to read smoother, more professional, and more polished—while keeping the original meaning.",
  "tags": ["polish", "rewrite", "writing"],
  "prompt": "Please polish the following text. Keep the original meaning but make it smoother, more professional, and more polished:\n\n{{content}}",
  "appliesTo": ["text", "code"],
  "outputMode": "copy",
  "minAppVersion": "3.0.0"
}
```

Localization override example (`i18n/zh-CN/writing/polish-copy.json`):

```json
{
  "name": "润色文案",
  "description": "润色选中的文本，使其更通顺、专业，保持原意。",
  "prompt": "请润色以下文本，保持原意但表达更通顺、专业、得体：\n\n{{content}}",
  "tags": ["润色", "改写", "写作"]
}
```

See `examples/template.json` for a base template and `examples/i18n-template.json` for an override template.

---

## How to contribute a new action (PR)

See [CONTRIBUTING.md](./CONTRIBUTING.md). In short:

1. Fork and clone this repo.
2. Create `<id>.json` under the right category directory (e.g. `actions/writing/my-action.json`) following the schema above (English base).
   For a new category, add it to `categories.json` first (order = sidebar order).
3. Optionally add translations under `i18n/<lang>/<category>/<id>.json` for any of the app's supported languages.
4. Run `npm run build` to regenerate `marketplace.json`.
5. Open a PR — **commit both your `<id>.json` and the regenerated `marketplace.json`** — and describe what the action does.

---

## Web preview / one-click install

`index.html` is a minimal showcase page: it loads `marketplace.json` from the same directory, renders the actions as cards, and each card has an **Install** button that triggers `clipboardxai://install?action=<id>` to open the app. A **Language** selector switches between the canonical English and any available locale overrides. Host it at `https://clipboard.w3cub.com/marketplace/` (same directory as the JSON) and share the link.

---

## License

Content in this repository is MIT licensed. By opening a PR you agree to publish your contributed action entries under the same license.
