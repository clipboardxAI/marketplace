# Contributing

Thanks for contributing actions to the ClipboxAI Action Marketplace! A high-quality action helps every user.

## What you can contribute

- **New actions** — a prompt template with variables that solves a concrete scenario (writing, dev, productivity, translate, social, analysis, …). Just add `actions/<category>/<id>.json`.
- **New categories** — if the existing 6 categories are not enough (please confirm you really need one). Add an entry to `categories.json` (array order = sidebar order).
- **Improve existing actions** — a better prompt, a more accurate description, or a fixed `appliesTo`. Edit the file directly, keep the `id` unchanged, and bump `version`.

## Repository conventions (read first)

- **One file per action**: `actions/<category>/<id>.json`. The directory name is the category id; the file name is the action id.
- **Do not put `id` or `category` inside the file** — they are derived from the path and name, and duplicating them risks drifting out of sync.
- **The base `name` / `description` / `prompt` must be English** (the catalog's canonical language). Translations go under `i18n/<lang>/` (see below).
- Before committing, you **must** run `npm run build` to regenerate `marketplace.json`, and **commit it together with your change**.
- Run `npm run validate` locally to pre-check (same validation as CI).

## Localization (i18n)

The app supports 23+ languages. The base action file is English; add translations under:

- `i18n/<lang>/<category>/<id>.json` — action override with any of `name`, `description`, `prompt`, `tags`. Missing keys fall back to English.
- `i18n/<lang>/categories.json` — category name overrides as `categoryId → name`.

`<lang>` must be one of the supported locale codes (see `src/types.ts` → `SUPPORTED_LOCALES`), or validation fails.

## Pre-submit checklist

When adding/editing `actions/<category>/<id>.json`, confirm:

- [ ] The file is under the correct category directory (`actions/<existing category id>/`).
- [ ] The file name (without `.json`) **is** the `id`: globally unique, lowercase kebab-case (e.g. `polish-copy`), not colliding with existing actions.
- [ ] The file does **not** contain `id` / `category` (derived from path).
- [ ] `name` is short and clear (English; ≤ ~8 words).
- [ ] `icon` is a **real SF Symbols** name (check [SF Symbols](https://developer.apple.com/sf-symbols/)).
- [ ] `author` is your GitHub username or handle.
- [ ] `version` uses semver (`1.0.0` first; bump like `1.1.0` on iteration).
- [ ] `prompt` uses the `{{content}}` and/or `{{type}}` variables sensibly.
- [ ] `appliesTo` only contains valid types: `text` `url` `image` `file` `code` `json` `email`.
- [ ] `outputMode` is `copy` or `openPanel`.
- [ ] `minAppVersion` is not artificially high — `3.0.0` if it runs.
- [ ] If you added translations, they live under `i18n/<lang>/...` and `<lang>` is a supported locale.
- [ ] You ran `npm run build` and committed the regenerated `marketplace.json`.
- [ ] `npm run validate` passes.

## Prompt writing tips

- Tell the model clearly **what to do + output format + constraints**. Example: "Polish the following text, keep the meaning but make it smoother and more professional. Output only the polished result, no explanation."
- Use `{{content}}` as a placeholder for the clipboard text and `{{type}}` for the content type; do not hardcode sample text.
- Avoid extra preamble/postamble (e.g. "Here you go: …") so the user gets something ready to use.

## Submission flow

1. Fork this repo and branch from `main`: `git checkout -b add-<your-action-id>`.
2. Create/edit a file, e.g. `actions/writing/my-action.json`.
3. Regenerate the catalog: `npm run build`.
4. Validate locally: `npm run validate`.
5. Commit and push: `git add actions/ i18n/ marketplace.json && git commit -m "add action: <id>" && git push`.
6. Open a Pull Request on GitHub describing what the action does and when to use it.

## Updating an existing action

If you improve an existing action, **keep the `id`** (the file name) unchanged and **bump `version`** (e.g. `1.0.0` → `1.1.0`). The app uses this to offer an upgrade in its "Update" button.

## Code of conduct

- Do not submit prompts that are malicious, attempt to exfiltrate private data, or are clearly low quality.
- Respect others' work; credit the original author when adapting.

Once merged and CI passes, the catalog takes effect on the next publish; all users see/install your action after refreshing the marketplace. 🎉
