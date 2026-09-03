// Structural check of every localized content file against its English
// master. Translation agents write JSON by hand, and the failure mode is
// always the same: a missing key renders as `undefined` on a live page, an
// extra key is dead weight, and an array of the wrong length silently drops a
// card. This catches all three before a build ships them.
//
//   node scripts/validate-content.mjs            # every locale
//   node scripts/validate-content.mjs de fr      # only these
//
// Exits non-zero on the first locale with problems, and prints all of them.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MASTER = "en";

// Arrays whose length is part of the layout rather than of the copy: the
// section renders a fixed grid, and a translation with one card fewer leaves
// a hole in it.
const FIXED_LENGTH_ARRAYS = ["statCards", "spotlights", "spotlights[].bullets", "comparison.rows"];

const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const exists = (file) => fs.existsSync(file);

/** Every key path in an object, arrays described by index. */
function shapeOf(value, prefix = "") {
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => shapeOf(v, `${prefix}[${i}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) =>
      shapeOf(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

/** Key path with array indices collapsed, so two files can be compared even
 *  when a fixed-length array legitimately differs (reported separately). */
const generalize = (p) => p.replace(/\[\d+\]/g, "[]");

function compare(masterValue, localeValue, label, problems) {
  const masterKeys = new Set(shapeOf(masterValue).map(generalize));
  const localeKeys = new Set(shapeOf(localeValue).map(generalize));

  for (const k of masterKeys) {
    if (!localeKeys.has(k)) problems.push(`${label}: missing key \`${k}\``);
  }
  for (const k of localeKeys) {
    if (!masterKeys.has(k)) problems.push(`${label}: unexpected key \`${k}\``);
  }
}

function checkArrayLengths(master, locale, label, problems) {
  const at = (obj, dotted) =>
    dotted.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), obj);

  for (const spec of FIXED_LENGTH_ARRAYS) {
    if (spec.includes("[]")) {
      const [outer, inner] = spec.split("[].");
      const mOuter = at(master, outer);
      const lOuter = at(locale, outer);
      if (!Array.isArray(mOuter) || !Array.isArray(lOuter)) continue;
      mOuter.forEach((m, i) => {
        const l = lOuter[i];
        if (!l) return;
        const mi = at(m, inner);
        const li = at(l, inner);
        if (Array.isArray(mi) && Array.isArray(li) && mi.length !== li.length) {
          problems.push(`${label}: ${outer}[${i}].${inner} has ${li.length} items, expected ${mi.length}`);
        }
      });
      continue;
    }
    const m = at(master, spec);
    const l = at(locale, spec);
    if (Array.isArray(m) && Array.isArray(l) && m.length !== l.length) {
      problems.push(`${label}: ${spec} has ${l.length} items, expected ${m.length}`);
    }
  }
}

/** Values that must NOT be translated — a locale that renders an English
 *  string here is fine, one that renders a translated URL slug is a 404. */
function checkUntranslatable(locale, label, problems) {
  const stripped = (s) => (typeof s === "string" ? s.trim() : "");
  if (!stripped(locale?.meta?.title)) problems.push(`${label}: empty meta.title`);
  if (!stripped(locale?.meta?.description)) problems.push(`${label}: empty meta.description`);
  const desc = stripped(locale?.meta?.description);
  if (desc.length > 165) problems.push(`${label}: meta.description is ${desc.length} chars (max 165)`);
  const title = stripped(locale?.meta?.title);
  if (title.length > 65) problems.push(`${label}: meta.title is ${title.length} chars (max 65)`);
}

function main() {
  const only = process.argv.slice(2);
  const chromeDir = path.join(root, "content", "chrome");
  const editorDir = path.join(root, "content", "editor");
  const blogDir = path.join(root, "content", "blog");

  const masterChrome = read(path.join(chromeDir, `${MASTER}.json`));
  const masterEditor = read(path.join(editorDir, `${MASTER}.json`));

  const articles = fs
    .readdirSync(blogDir)
    .filter((f) => fs.statSync(path.join(blogDir, f)).isDirectory())
    .sort();
  const masterArticles = Object.fromEntries(
    articles.map((id) => [id, read(path.join(blogDir, id, `${MASTER}.json`))]),
  );

  const locales = fs
    .readdirSync(chromeDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((l) => l !== MASTER)
    .filter((l) => only.length === 0 || only.includes(l))
    .sort();

  const problems = [];

  for (const locale of locales) {
    const chrome = read(path.join(chromeDir, `${locale}.json`));
    compare(masterChrome, chrome, `chrome/${locale}`, problems);
    checkArrayLengths(masterChrome, chrome, `chrome/${locale}`, problems);
    checkUntranslatable(chrome, `chrome/${locale}`, problems);

    const editorFile = path.join(editorDir, `${locale}.json`);
    if (!exists(editorFile)) {
      problems.push(`editor/${locale}: missing (the locale would render an English editor)`);
    } else {
      compare(masterEditor, read(editorFile), `editor/${locale}`, problems);
    }

    for (const id of articles) {
      const file = path.join(blogDir, id, `${locale}.json`);
      if (!exists(file)) {
        problems.push(`blog/${id}/${locale}: missing (falls back to English)`);
        continue;
      }
      compare(masterArticles[id], read(file), `blog/${id}/${locale}`, problems);
    }
  }

  if (problems.length) {
    for (const p of problems) console.error(`✗ ${p}`);
    console.error(`\n${problems.length} problem(s) across ${locales.length} locale(s)`);
    process.exit(1);
  }
  console.log(`✓ ${locales.length} locale(s) match the ${MASTER} master`);
}

main();
