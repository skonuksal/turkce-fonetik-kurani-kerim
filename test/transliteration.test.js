const assert = require("node:assert/strict");
const { test } = require("node:test");
const { convertVerse } = require("../src/convert");
const wbw = require("../data/quranwbw-syllables.json");
const source = require("../data/acikkuran-turkish-phonetic.json");
const arabic = require("../data/arabic-uthmani.json");
const basic = require("../output/turkish-syllables.json");
const tajweed = require("../output/turkish-syllables-tajweed.json");

function spelling(value) {
  return value.toLocaleLowerCase("tr").replace(/i\u0307/g, "i")
    .normalize("NFC").replace(/[\s.,;!?\u2015-]/gu, "");
}

test("keeps source word endings and boundary apostrophes", () => {
  const v = convertVerse(wbw["2:23"], source["2:23"]);
  assert.equal(spelling(v.words[11]), "mislihi");
  const joined = convertVerse(wbw["2:21"], source["2:21"]).words.join("");
  assert.ok(spelling(joined).includes("nasu'budu"));
});

test("unmapped or missing Turkish text cannot leak English into the reader", () => {
  assert.deepEqual(convertVerse(["one", "two"], "").words, []);
  assert.deepEqual(convertVerse(wbw["4:119"], source["4:119"]).words, []);
});

test("both readers contain the same complete corpus and mark unresolved alignments", () => {
  const keys = Object.keys(source).sort();
  assert.equal(keys.length, 6236);
  for (const corpus of [basic, tajweed, wbw, arabic]) {
    assert.deepEqual(Object.keys(corpus).sort(), keys);
  }
  const knownUnresolved = new Set([
    "2:273", "3:58", "3:126", "4:83", "4:119", "11:2", "11:61", "12:107",
    "16:110", "17:28", "28:79", "36:27", "40:62", "41:44", "42:15", "42:31", "48:18",
  ]);
  for (const key of keys) {
    const words = basic[key];
    assert.equal(words.length, tajweed[key].length, key);
    if (!words.length) {
      assert.ok(knownUnresolved.has(key), key);
      continue;
    }
    assert.equal(words.length, wbw[key].length, key);
    // The Arabic dataset uses NBSP inside a single reading group.
    assert.equal(words.length, arabic[key].split(" ").length, key);
    assert.ok(words.every(word => spelling(word).length > 0), key);
    assert.equal(spelling(words.join("")), spelling(source[key]), key);
  }
  assert.deepEqual(arabic["37:130"].split(" ").map(group => group.split("\u00a0").length), [1, 1, 2]);
  assert.deepEqual(arabic, require("../apk-build/www/data/arabic-uthmani.json"));
  assert.deepEqual(basic, require("../apk-build/www/output/turkish-syllables.json"));
  assert.deepEqual(tajweed, require("../apk-build/www/output/turkish-syllables-tajweed.json"));
});

test("published Turkish reference is complete and identical to the pinned source blob", () => {
  const fs = require("node:fs");
  const { createHash } = require("node:crypto");
  const file = fs.readFileSync(require.resolve("../data/muhammet-abay.json"));
  const hash = createHash("sha1").update(`blob ${file.length}\0`).update(file).digest("hex");
  assert.equal(hash, "dba121c1a132564b72d685005041f6ff7b94b6e7");
  assert.ok(file.equals(fs.readFileSync(require.resolve("../apk-build/www/data/muhammet-abay.json"))));
  const verses = JSON.parse(file).quran;
  const keys = verses.map(v => `${v.chapter}:${v.verse}`);
  assert.deepEqual(keys.sort(), Object.keys(wbw).sort());
  assert.ok(verses.every(v => typeof v.text === "string" && v.text.trim().length > 0));
});
