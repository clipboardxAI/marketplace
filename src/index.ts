// CLI entry point for the ClipboxAI Action Marketplace build tool.
//
//   npm run build     # aggregate actions/ + categories.json (+ i18n/) -> marketplace.json
//   npm run validate  # validate source and confirm marketplace.json is up to date (CI)
//   npm run split     # one-off: marketplace.json -> actions/<cat>/<id>.json
//
// Environment overrides:
//   CATALOG_VERSION   catalogVersion (default: today as YYYY.MM.DD)
//   UPDATED_AT        updatedAt      (default: today as YYYY-MM-DD)

import { cmdBuild, cmdSplit, cmdValidate } from "./builder.js";

const COMMANDS: Record<string, () => void> = {
  build: cmdBuild,
  split: cmdSplit,
  validate: cmdValidate,
};

function printHelp(): void {
  process.stdout.write(
    [
      "ClipboxAI · Action Marketplace build tool",
      "",
      "Usage: tsx src/index.ts <command>",
      "",
      "Commands:",
      "  build     Aggregate actions/ + categories.json (+ i18n/) into marketplace.json",
      "            AND one marketplace.<lang>.json pack per language (zh-CN/zh-TW/es/ja/de/fr)",
      "  validate  Validate source and confirm marketplace.json + packs are in sync (CI)",
      "  split     One-off migration: marketplace.json -> actions/<category>/<id>.json",
      "",
    ].join("\n"),
  );
}

const cmd = process.argv[2];
if (!cmd || cmd === "-h" || cmd === "--help") {
  printHelp();
  process.exit(cmd ? 0 : 1);
}

const fn = COMMANDS[cmd];
if (!fn) {
  process.stderr.write("❌ Unknown command: " + cmd + "\n\n");
  printHelp();
  process.exit(1);
}

try {
  fn();
} catch (e: any) {
  process.stderr.write("❌ " + (e?.message ?? e) + "\n");
  process.exit(1);
}
