const { convertVerse, convertAll } = require("./convert");
const { convertVerseUnified, generateAllUnified } = require("./phonetic");
const { needlemanWunsch } = require("./align");
const { normalizeWBWSyllable, normalizeAcikChar } = require("./normalize");

module.exports = {
  convertVerse,
  convertAll,
  convertVerseUnified,
  generateAllUnified,
  needlemanWunsch,
  normalizeWBWSyllable,
  normalizeAcikChar,
};
