## Action being added / changed

- **Action ID**: `<!-- e.g. polish-copy -->`
- **Category**: `<!-- e.g. writing -->`
- **New / Update / Remove**: `<!-- choose one -->`

## What does it do?

<!-- One or two sentences describing the action and the AI prompt behind it. -->

## Checklist

- [ ] I ran `npm run build` and committed the regenerated `marketplace.json`.
- [ ] The action file lives at `actions/<category>/<id>.json` (id = filename, lowercase kebab-case).
- [ ] All required fields are present (`name`, `icon`, `author`, `version`, `description`, `tags`, `prompt`, `appliesTo`, `outputMode`, `minAppVersion`).
- [ ] `appliesTo` only uses: text, url, image, file, code, json, email.
- [ ] `outputMode` is `copy` or `openPanel`.
- [ ] `version` / `minAppVersion` use `x.y.z` semver.
- [ ] If I added translations, they live under `i18n/<lang>/<category>/<id>.json` and `<lang>` is one of the app's supported locales.
- [ ] `npm run validate` passes locally.

## Localization (optional)

- [ ] I provided an English base (required).
- [ ] I added translations under `i18n/<lang>/...` (optional, any of the 23+ app locales).
