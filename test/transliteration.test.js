const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { test } = require("node:test");
const { convertVerseUnified } = require("../src/phonetic");
const arabic = require("../data/arabic-uthmani.json");
const arabicAcik = require("../data/arabic-acikkuran.json");
const abayJson = require("../data/muhammet-abay.json");
const wbwMeanings = require("../data/wbw-turkish-meanings.json");
const basic = require("../output/turkish-syllables.json");
const tajweed = require("../output/turkish-syllables-tajweed.json");
const classicDiff = require("../output/turkish-classic-diff.json");

const abay = Object.fromEntries(
  abayJson.quran.map((v) => [`${v.chapter}:${v.verse}`, v.text])
);

test("unified phonetic & tajweed outputs match expected Turkish kıraat samples", () => {
  assert.deepEqual(basic["1:1"], ["bis-mil-", "lâ-hir-", "rah-mâ-nir-", "ra-hîm"]);
  assert.deepEqual(tajweed["1:1"], ["bis-mil-", "lâ-hir-", "rah\u0304-mâ-nir-", "ra-h\u0304îm"]);

  assert.deepEqual(basic["1:6"], ["ih-di-nas-", "sı-râ-tal-", "müs-te-kîm"]);
  assert.deepEqual(basic["1:7"], [
    "sı-râ-tal-", "le-zî-ne", "en-'am-te", "a-ley-him",
    "ğay-ril-", "mağ-dû-bi", "a-ley-him", "ve-lad-", "dâl-lîn",
  ]);
  assert.deepEqual(tajweed["1:7"], [
    "sı-râ-t\u0307al-", "le-z\u0332î-ne", "en-'am-te", "a-ley-him",
    "ğay-ril-", "mağ-d\u0307û-bi", "a-ley-him", "ve-lad\u0307-", "d\u0307âl-lîn",
  ]);

  assert.deepEqual(basic["2:1"], ["elif-lâm-mîm"]);
  assert.deepEqual(basic["2:2"], [
    "zâ-li-kel-", "ki-tâ-bü", "lâ", "ray-be", "fîh", "hü-del-", "lil-müt-te-kîn",
  ]);

  // Practical Turkish thick Lafzatullah (tefhîm) vs thin Lafzatullah after kesre
  assert.deepEqual(basic["48:4"].slice(-4), ["ve-kâ-nal-", "lâ-hu", "a-lî-men", "ha-kî-mâ"]);
  assert.deepEqual(basic["112:1"], ["kul", "hü-val-", "lâ-hu", "e-had"]);
  assert.deepEqual(basic["112:2"], ["al-lâ-hus-", "sa-med"]);
  assert.equal(basic["2:255"][0], "al-lâ-hu");
  assert.equal(basic["2:19"][16], "val-lâ-hu");
  assert.equal(basic["2:64"][6], "fad-lul-");
  assert.equal(basic["2:64"][7], "lâ-hi");
  assert.equal(basic["2:73"][4], "yuh-yil-");
  assert.equal(basic["2:73"][5], "lâ-hül-");
  assert.equal(basic["10:59"][13], "âl-lâ-hu");
  assert.equal(basic["21:57"][0], "ve-tal-lâ-hi");

  assert.deepEqual(basic["48:18"], [
    "le-kad", "ra-dı-yal-", "lâ-hu", "a-nil-", "mü'-mi-nî-ne", "iz",
    "yü-bâ-yi-'û-ne-ke", "tah-teş-", "şe-ce-ra-ti", "fe-'a-li-me", "mâ",
    "fî", "ku-lû-bi-him", "fe-en-ze-les-", "se-kî-ne-te", "a-ley-him",
    "ve-e-sâ-be-hüm", "fet-han", "ka-rî-bâ",
  ]);
  assert.equal(tajweed["48:18"][0], "le-gad");
  assert.equal(tajweed["48:18"][5], "iz\u0332");
  assert.equal(tajweed["48:18"][12], "gu-lû-bi-him");

  assert.equal(basic["4:119"].length, 21);
  assert.equal(basic["4:119"][20], "mü-bî-nâ");

  assert.equal(basic["63:10"][1], "mim-");
  assert.equal(basic["63:10"][2], "mâ");

  assert.equal(basic["7:8"][1], "yev-me-i-zi-nil-");
  assert.equal(basic["29:25"][21], "ve-me'-vâ-kü-mün-");

  const direct = convertVerseUnified("48:18", arabic["48:18"], abay["48:18"]);
  assert.deepEqual(direct.basic, basic["48:18"]);
  assert.deepEqual(direct.tajweed, tajweed["48:18"]);

  // Classic (Abay) style diff overlay reconstructs exact Abay vowel spelling
  const classic48_4 = convertVerseUnified("48:4", arabic["48:4"], abay["48:4"], { style: "classic" });
  const patched48_4 = basic["48:4"].slice();
  for (const [idx, val] of Object.entries(classicDiff.b["48:4"] || {})) patched48_4[idx] = val;
  assert.deepEqual(patched48_4, classic48_4.basic);
  assert.deepEqual(patched48_4.slice(-4), ["ve-kâ-nel-", "lâ-hü", "a-lî-men", "ha-kî-mâ"]);
  assert.equal(classicDiff.b["1:7"]["7"], "ve-led-");
  assert.equal(classicDiff.b["112:1"]["1"], "hü-vel-");
  assert.equal(classicDiff.b["112:1"]["2"], "lâ-hü");
});

test("all 6,236 verses and 77,429 words align 100% with zero academic symbol leakage", () => {
  const keys = Object.keys(arabic).sort();
  assert.equal(keys.length, 6236);
  for (const corpus of [basic, tajweed, arabicAcik, abay]) {
    assert.deepEqual(Object.keys(corpus).sort(), keys);
  }

  const academicLeak = /[ḳẕżŝṣḍṭḥḫ`]/u;
  let totalWords = 0;

  for (const key of keys) {
    const [s, v] = key.split(":");
    const arLen = arabic[key].split(" ").length;
    assert.equal(arLen, arabicAcik[key].split(" ").length, key);
    assert.equal(basic[key].length, arLen, `basic length mismatch at ${key}`);
    assert.equal(tajweed[key].length, arLen, `tajweed length mismatch at ${key}`);
    assert.equal(wbwMeanings[s]?.[v]?.[0]?.length, arLen, `wbw meanings length mismatch at ${key}`);

    for (let i = 0; i < arLen; i++) {
      const bw = basic[key][i];
      const tw = tajweed[key][i];
      assert.ok(bw.length > 0 && tw.length > 0, `empty word at ${key}[${i}]`);
      assert.ok(!bw.includes("--") && !tw.includes("--"), `double hyphen at ${key}[${i}]`);
      assert.ok(!bw.startsWith("-") && !tw.startsWith("-"), `leading hyphen at ${key}[${i}]`);
      assert.ok(!academicLeak.test(bw), `academic symbol leaked in basic at ${key}[${i}]: ${bw}`);
      assert.ok(!academicLeak.test(tw), `academic symbol leaked in tajweed at ${key}[${i}]: ${tw}`);
      assert.ok(/[aeıioöuüâîû]/u.test(bw), `vowelless word at ${key}[${i}]: ${bw}`);
      totalWords++;
    }
  }

  assert.equal(totalWords, 77429);
  assert.deepEqual(arabic["37:130"].split(" ").map((g) => g.split("\u00a0").length), [1, 1, 2]);
});

test("web demo and Android APK bundles are identical and free of unused data", () => {
  for (const [a, b] of [
    ["../demo/index.html", "../apk-build/www/index.html"],
    ["../output/turkish-syllables.json", "../apk-build/www/output/turkish-syllables.json"],
    ["../output/turkish-syllables-tajweed.json", "../apk-build/www/output/turkish-syllables-tajweed.json"],
    ["../output/turkish-classic-diff.json", "../apk-build/www/output/turkish-classic-diff.json"],
    ["../data/arabic-uthmani.json", "../apk-build/www/data/arabic-uthmani.json"],
    ["../data/arabic-acikkuran.json", "../apk-build/www/data/arabic-acikkuran.json"],
    ["../data/diyanet-meal.json", "../apk-build/www/data/diyanet-meal.json"],
    ["../data/wbw-turkish-meanings.json", "../apk-build/www/data/wbw-turkish-meanings.json"],
  ]) {
    assert.ok(
      fs.readFileSync(require.resolve(a)).equals(fs.readFileSync(require.resolve(b))),
      `${a} differs from ${b}`
    );
  }

  // Ensure dead runtime assets are not shipped in APK
  const wwwDataDir = path.join(__dirname, "../apk-build/www/data");
  const wwwFiles = fs.readdirSync(wwwDataDir).sort();
  assert.deepEqual(wwwFiles, [
    "arabic-acikkuran.json",
    "arabic-uthmani.json",
    "diyanet-meal.json",
    "wbw-turkish-meanings.json",
  ]);
});

test("pinned Muhammet Abay source blob is intact", () => {
  const raw = fs.readFileSync(require.resolve("../data/muhammet-abay.json"), "utf8");
  const lf = Buffer.from(raw.replace(/\r\n/g, "\n"), "utf8");
  const hash = createHash("sha1").update(`blob ${lf.length}\0`).update(lf).digest("hex");
  assert.equal(hash, "dba121c1a132564b72d685005041f6ff7b94b6e7");
  const verses = JSON.parse(raw).quran;
  assert.equal(verses.length, 6236);
});
