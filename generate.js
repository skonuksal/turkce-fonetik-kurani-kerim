/**
 * Generate unified Turkish phonetic (Temel) and tajweed (Tecvid) syllable data
 * for all 6,236 verses (77,429 Arabic words).
 *
 * Usage: node generate.js
 *
 * Reads:
 *   data/arabic-uthmani.json   (Tanzil Uthmani Arabic word positions)
 *   data/muhammet-abay.json    (Tanzil Muhammet Abay Turkish transliteration)
 *
 * Writes:
 *   output/turkish-syllables.json
 *   output/turkish-syllables-tajweed.json
 *   apk-build/www/output/turkish-syllables.json
 *   apk-build/www/output/turkish-syllables-tajweed.json
 */

const fs = require("fs");
const path = require("path");
const { generateAllUnified } = require("./src/phonetic");

const arabicData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data/arabic-uthmani.json"), "utf-8")
);

const abayJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data/muhammet-abay.json"), "utf-8")
);

const abayMap = {};
for (const entry of abayJson.quran) {
  abayMap[`${entry.chapter}:${entry.verse}`] = entry.text;
}

console.log("Generating unified Turkish phonetic & tajweed data...");
const { basicResult, tajweedResult, classicDiff, processed } = generateAllUnified(
  arabicData,
  abayMap
);

// Both web demo and Android APK load these JSON files directly.
for (const [file, payload, compact] of [
  ["turkish-syllables.json", basicResult, false],
  ["turkish-syllables-tajweed.json", tajweedResult, false],
  ["turkish-classic-diff.json", classicDiff, true],
]) {
  const json = compact ? JSON.stringify(payload) : JSON.stringify(payload, null, 2);
  for (const dir of ["output", "apk-build/www/output"]) {
    fs.writeFileSync(path.join(__dirname, dir, file), json, "utf-8");
  }
}

const classicDiffVerses = Object.keys(classicDiff.b).length;
console.log(`Done. ${processed} ayet islendi, 0 hata. (Klasik fark: ${classicDiffVerses} ayet)`);

const samples = ["1:1", "1:7", "2:2", "48:18", "112:1"];
console.log("\nOrnekler (Temel):");
for (const v of samples) {
  console.log(`  ${v}: ${basicResult[v].join(" | ")}`);
}
console.log("\nOrnekler (Tecvid):");
for (const v of samples) {
  console.log(`  ${v}: ${tajweedResult[v].join(" | ")}`);
}
