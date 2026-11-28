/**
 * Unified Turkish phonetic & tajweed generator.
 *
 * Aligns Muhammet Abay's published Turkish Quran transliteration (Tanzil)
 * directly to the Uthmani Arabic word positions (all 6,236 verses / 77,429 words),
 * shifts liaison consonants cleanly to Turkish syllable boundaries, applies
 * Turkish vowel harmony (â/î/û + ü/u + kalın ı/i), Turkish syllabification,
 * and emits both:
 *   - Temel (basic readable Turkish phonetic)
 *   - Tecvid (Mushaf combining marks: z̲, ż̲, s̲, ḋ, ṫ, h̄, ḣ, ق→g, غ→ğ)
 */

const COMBINING_LOW_LINE = "\u0332"; // peltek (ذ, ث, ظ)
const COMBINING_DOT_ABOVE = "\u0307"; // kalın (ض, ط, ظ, خ)
const COMBINING_MACRON = "\u0304"; // kalın ح

const VOWELS = new Set([..."aeıioöuüâîû"]);
const KALIN_ABAY = new Set(["ṣ", "ḍ", "ṭ", "ż", "ḳ", "ḫ", "g"]);
const STRIP_WAQF = /[\u06D6-\u06ED]/g;
// Standalone Lafzatullah that links to a preceding word (ٱللَّهُ / ٱللَّهَ / ٱللَّهِ / ٱللَّهُمَّ)
const AR_LAFZATULLAH_HEAD = /^\u0671\u0644\u0644\u0651\u064E\u0647(?:\u064F\u0645\u0651\u064E|[\u064E\u064F\u0650])?$/u;
// Prefixed thick Lafzatullah (وَٱللَّهُ, وَٱللَّهِ, فَٱللَّهُ, تَٱللَّهِ, وَتَٱللَّهِ, ءَآللَّهُ)
const AR_LAFZATULLAH_PREFIXED_THICK = /^(?:\u0648\u064E|\u0641\u064E|\u062A\u064E|\u0648\u064E\u062A\u064E|\u0621\u064E\u0627\u0653)\u0671?\u0644\u0644\u0651\u064E\u0647[\u064E\u064F\u0650]?$/u;
// Nominative Lafzatullah ending in damme (ٱللَّهُ, وَٱللَّهُ, فَٱللَّهُ, ءَآللَّهُ — excludes ٱللَّهُمَّ)
const AR_LAFZATULLAH_DAMME = /^(?:(?:\u0648\u064E|\u0641\u064E|\u0621\u064E\u0627\u0653)?\u0671|\u0621\u064E\u0627\u0653)\u0644\u0644\u0651\u064E\u0647\u064F$/u;
// Emphatic (kalın) Arabic consonants whose shifted coda backs a preceding Turkish 'e'/'ü'
const EMPHATIC_LIAISON = new Set(["ṣ", "ḍ", "ṭ", "ż"]);

const MUKATTAA_SKELETON = {
  "الم": "eliflammim",
  "المص": "eliflammimsad",
  "الر": "eliflamra",
  "المر": "eliflammimra",
  "كهيعص": "kafhayaynsad",
  "طه": "taha",
  "طسم": "tasimmim",
  "طس": "tasin",
  "يس": "yasin",
  "ص": "sad",
  "حم": "hamim",
  "عسق": "aynsinkaf",
  "ق": "kaf",
  "ن": "nun",
};

const AR_SKEL = {
  "\u0621": "", "\u0622": "a", "\u0623": "a", "\u0624": "u", "\u0625": "i", "\u0626": "i",
  "\u0627": "a", "\u0628": "b", "\u0629": "t", "\u062A": "t", "\u062B": "s", "\u062C": "c",
  "\u062D": "h", "\u062E": "h", "\u062F": "d", "\u0630": "z", "\u0631": "r", "\u0632": "z",
  "\u0633": "s", "\u0634": "s", "\u0635": "s", "\u0636": "d", "\u0637": "t", "\u0638": "z",
  "\u0639": "", "\u063A": "g", "\u0641": "f", "\u0642": "k", "\u0643": "k", "\u0644": "l",
  "\u0645": "m", "\u0646": "n", "\u0647": "h", "\u0648": "v", "\u0649": "a", "\u064A": "y",
  "\u0670": "a", "\u0671": "",
  "\u064E": "a", "\u064F": "u", "\u0650": "i",
  "\u064B": "an", "\u064C": "un", "\u064D": "in",
};

// Exact 2-Arabic-word compounds written as 1 token in Abay
const TWO_ARABIC_SPLITS = {
  "küllemâ": ["külle", "mâ"],
  "fîmâ": ["fî", "mâ"],
  "mimmâ": ["mim", "mâ"],
};

function stripArabicDiacritics(ar) {
  return ar.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "").replace(/\u0671/g, "\u0627");
}

function isMukattaa(arWord) {
  const bare = stripArabicDiacritics(arWord).replace(/\u00a0/g, "");
  return Boolean(MUKATTAA_SKELETON[bare]) && !/[\u064E\u064F\u0650\u0652]/.test(arWord);
}

function arSkeleton(arWord) {
  const bare = stripArabicDiacritics(arWord).replace(/\u00a0/g, "");
  if (isMukattaa(arWord)) return MUKATTAA_SKELETON[bare];
  const cleaned = arWord
    .replace(/\u0648[\u0652\u0653]?\u0627[\u06DF\u06E0\u06D6-\u06ED]*$/u, "\u0648")
    .replace(/[\u06D6-\u06ED]/g, "");
  let out = "";
  const chars = [...cleaned];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === "\u0651") {
      if (out.length && !/[aiu]/.test(out[out.length - 1])) out += out[out.length - 1];
      continue;
    }
    if (ch === "\u0648" && out.endsWith("u") && i + 1 < chars.length && !/[\u064E\u064F\u0650\u0651]/.test(chars[i + 1])) {
      continue;
    }
    if ((ch === "\u064A" || ch === "\u0649") && out.endsWith("i") && (i + 1 >= chars.length || !/[\u064E\u064F\u0650\u0651]/.test(chars[i + 1]))) {
      continue;
    }
    if (AR_SKEL[ch]) out += AR_SKEL[ch];
  }
  return out.replace(/a+/g, "a").replace(/i+/g, "i").replace(/u+/g, "u");
}

function abaySkeleton(tok) {
  const map = {
    "â": "a", "î": "i", "û": "u", "ü": "u", "ö": "o", "ı": "i",
    "ŝ": "s", "ş": "s", "ṣ": "s", "ż": "z", "ẕ": "z",
    "ḍ": "d", "ṭ": "t", "ḥ": "h", "ḫ": "h", "ḳ": "k", "ğ": "g", "e": "a",
  };
  let out = "";
  for (const ch of tok.toLowerCase()) {
    if (map[ch]) out += map[ch];
    else if (/[a-z]/.test(ch)) out += ch;
  }
  return out.replace(/a+/g, "a").replace(/i+/g, "i").replace(/u+/g, "u");
}

function editDist(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = new Int32Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[n];
}

/**
 * Normalize verified source boundary typos in the pinned Abay text
 * so every token boundary matches Uthmani Arabic word positions.
 */
function preprocessAbay(verseKey, text) {
  let out = text.trim();
  if (verseKey === "3:154") out = out.replace("min-l'emri", "mine-l'emri");
  if (verseKey === "6:99") out = out.replace("müteşâbih.-nżurû", "müteşâbih. ünżurû");
  if (verseKey === "4:78") out = out.replace("femâ lihâülâi", "femâli hâülâi");
  if (verseKey === "18:49" || verseKey === "25:7") out = out.replace("mâ lihâẕe", "mâli hâẕe");
  if (verseKey === "70:36") out = out.replace("femâ lilleẕîne", "femâli-lleẕîne");
  return out;
}

function tokenizeAbay(text) {
  const tokens = [];
  const seps = [];
  const re = /([^\s-]+)([\s-]*)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    tokens.push(m[1].replace(/\./g, ""));
    seps.push(m[2].includes("-") ? "-" : (m[2] ? " " : ""));
  }
  return { tokens, seps };
}

/**
 * Align Abay tokens 1-to-1 with Uthmani Arabic words using DP on phonetic skeletons.
 */
function alignAbayToArabic(verseKey, arWords, abayText) {
  const cleaned = preprocessAbay(verseKey, abayText);
  const { tokens, seps } = tokenizeAbay(cleaned);
  const A = arWords.length;
  const B = tokens.length;
  const arSkels = arWords.map(arSkeleton);
  const abSkels = tokens.map(abaySkeleton);

  const INF = 1e9;
  const dp = Array.from({ length: A + 1 }, () => new Float64Array(B + 1).fill(INF));
  const bt = Array.from({ length: A + 1 }, () => new Array(B + 1).fill(null));
  dp[0][0] = 0;

  for (let i = 0; i <= A; i++) {
    for (let j = 0; j <= B; j++) {
      if (dp[i][j] >= INF) continue;

      if (i < A && j < B) {
        const d = editDist(arSkels[i], abSkels[j]);
        const cost = dp[i][j] + d;
        if (cost < dp[i + 1][j + 1]) {
          dp[i + 1][j + 1] = cost;
          bt[i + 1][j + 1] = [1, 1];
        }
      }

      if (i < A) {
        const muk = isMukattaa(arWords[i]);
        const maxK = muk ? 5 : 2;
        let combined = abSkels[j] || "";
        for (let k = 2; k <= maxK && j + k <= B; k++) {
          combined += abSkels[j + k - 1];
          let penalty = 0.8;
          if (muk) {
            penalty = 0.1;
          } else if (
            k === 2 &&
            (tokens[j] === "yâ" || tokens[j] === "veyâ") &&
            (arWords[i].startsWith("يَٰ") || arWords[i].startsWith("وَيَٰ"))
          ) {
            penalty = 0.1;
          } else if (k === 2 && tokens[j + 1] === "yâ") {
            penalty = 4.0;
          }
          const d = editDist(arSkels[i], combined) + penalty;
          const cost = dp[i][j] + d;
          if (cost < dp[i + 1][j + k]) {
            dp[i + 1][j + k] = cost;
            bt[i + 1][j + k] = [1, k];
          }
        }
      }

      if (i + 2 <= A && j < B && TWO_ARABIC_SPLITS[tokens[j]]) {
        const combinedAr = arSkels[i] + arSkels[i + 1];
        const d = editDist(combinedAr, abSkels[j]) + 0.2;
        const cost = dp[i][j] + d;
        if (cost < dp[i + 2][j + 1]) {
          dp[i + 2][j + 1] = cost;
          bt[i + 2][j + 1] = [2, 1];
        }
      }
    }
  }

  const ops = [];
  let i = A;
  let j = B;
  while (i > 0 || j > 0) {
    const op = bt[i][j];
    if (!op) throw new Error(`Alignment failed on ${verseKey}`);
    ops.push([i - op[0], op[0], j - op[1], op[1]]);
    i -= op[0];
    j -= op[1];
  }
  ops.reverse();

  const aligned = [];
  for (const [ai, ac, bi, bc] of ops) {
    if (ac === 2 && bc === 1) {
      const pair = TWO_ARABIC_SPLITS[tokens[bi]];
      aligned.push({ text: pair[0], linkedNext: true, hasLiaisonHyphen: false, isMukattaa: false });
      aligned.push({ text: pair[1], linkedNext: seps[bi] === "-", hasLiaisonHyphen: seps[bi] === "-", isMukattaa: false });
    } else if (ac === 1 && bc === 1) {
      aligned.push({
        text: tokens[bi],
        linkedNext: seps[bi] === "-",
        hasLiaisonHyphen: seps[bi] === "-",
        isMukattaa: isMukattaa(arWords[ai]),
      });
    } else if (ac === 1 && bc > 1) {
      const muk = isMukattaa(arWords[ai]);
      let joined = tokens[bi];
      for (let k = 1; k < bc; k++) {
        joined += (muk ? "-" : seps[bi + k - 1] || " ") + tokens[bi + k];
      }
      aligned.push({
        text: joined,
        linkedNext: seps[bi + bc - 1] === "-",
        hasLiaisonHyphen: seps[bi + bc - 1] === "-",
        isMukattaa: muk,
      });
    } else {
      throw new Error(`Unexpected alignment op [${ac},${bc}] on ${verseKey}`);
    }
  }

  if (aligned.length !== A) {
    throw new Error(`Aligned length mismatch on ${verseKey}: ${aligned.length} !== ${A}`);
  }
  return aligned;
}

/**
 * Shift liaison codas across Abay '-' boundaries to match Turkish syllabic reading
 * and apply practical Turkish vowel harmony for thick Lafzatullah (tefhîm) and
 * emphatic sun-letter / cluster liaisons (ص ض ط ظ):
 *   bismi-llâhi-rraḥmâni-rraḥîm  ->  bismil- | lâhir- | raḥmânir- | raḥîm
 *   vekâne-llâhü                 ->  vekânal- | lâhu
 *   faḍlü-llâhi                  ->  faḍlul- | lâhi
 *   vellâhü                      ->  vallâhu
 *   vele-ḍḍâllîn                 ->  velaḍ- | ḍâllîn
 *   ihdine-ṣṣirâṭa               ->  ihdinaṣ- | ṣirâṭa
 *   yevmeiẕin-lḥaḳḳ              ->  yevmeiẕinil- | ḥaḳḳ  (nûn-u kutnî)
 *   veme'vâküm-nnâru             ->  veme'vâkümün- | nâru (mîm-i cem')
 */
function shiftLiaisonConsonants(arWords, aligned, style = "practical") {
  const practical = style !== "classic";

  if (practical) {
    for (let i = 0; i < aligned.length; i++) {
      const cleanAr = arWords[i].replace(STRIP_WAQF, "");
      const prevEndsInI =
        i > 0 &&
        aligned[i - 1].hasLiaisonHyphen &&
        aligned[i - 1].text.endsWith("i");

      if (AR_LAFZATULLAH_PREFIXED_THICK.test(cleanAr)) {
        if (cleanAr.startsWith("\u0621\u064E\u0627\u0653")) {
          aligned[i].text = aligned[i].text.replace(/^e(?=llâh)/, "â");
        } else {
          aligned[i].text = aligned[i].text.replace(/e(?=llâh)/, "a");
        }
      }

      if (AR_LAFZATULLAH_DAMME.test(cleanAr) && !prevEndsInI) {
        aligned[i].text = aligned[i].text.replace(/llâhü$/, "llâhu");
      }
    }
  }

  for (let i = 0; i < aligned.length - 1; i++) {
    if (!aligned[i].hasLiaisonHyphen || aligned[i].isMukattaa) continue;
    let prev = aligned[i].text;
    let next = aligned[i + 1].text;
    if (!prev || !next) continue;

    const lastChar = prev[prev.length - 1];
    if (!VOWELS.has(lastChar)) {
      if (lastChar === "n") prev += "i";
      else if (lastChar === "m") prev += "ü";
    }

    if (practical) {
      const nextAr = arWords[i + 1].replace(STRIP_WAQF, "");
      const isThickLafz = AR_LAFZATULLAH_HEAD.test(nextAr);
      const isEmphaticCluster =
        next.length >= 2 &&
        EMPHATIC_LIAISON.has(next[0]) &&
        !VOWELS.has(next[1]);

      if (isThickLafz || isEmphaticCluster) {
        if (prev.endsWith("e")) prev = prev.slice(0, -1) + "a";
        else if (prev.endsWith("ü")) prev = prev.slice(0, -1) + "u";
      }
    }

    if (next.length >= 2 && !VOWELS.has(next[0]) && !VOWELS.has(next[1])) {
      prev += next[0];
      next = next.slice(1);
    }

    aligned[i].text = prev;
    aligned[i + 1].text = next;
  }
}

/**
 * Mark cross-word idğâm / iklâb (tanwîn / nûn sâkine / mîm sâkine assimilation)
 * so Turkish mode groups them as connected reading.
 */
function detectIdgamLinks(arWords, aligned) {
  const TANWIN_OR_NUN_END = /[\u064B\u064C\u064D]|(?:\u0646\u0652?|\u0645\u0652?)[\u06D6-\u06ED]*$/u;
  for (let i = 0; i < aligned.length - 1; i++) {
    if (aligned[i].linkedNext || aligned[i].isMukattaa) continue;
    if (!TANWIN_OR_NUN_END.test(arWords[i])) continue;
    const prev = aligned[i].text;
    const next = aligned[i + 1].text;
    const c1 = prev[prev.length - 1];
    const c2 = next[0] === "`" || next[0] === "'" ? next[1] : next[0];
    if (!c1 || !c2) continue;
    const sameIdgam = "lrmvy".includes(c1) && c1 === c2;
    const iklab = c1 === "m" && c2 === "b";
    if (sameIdgam || iklab) {
      aligned[i].linkedNext = true;
    }
  }
}

/**
 * Convert short 'i' immediately after the 7 Arabic istilâ (kalın) consonants
 * (ص ض ط ظ ق خ غ = ṣ ḍ ṭ ż ḳ ḫ g) to Turkish dotless 'ı'.
 * Long 'î' is preserved.
 */
function applyKalinDotlessI(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "i" && i > 0 && KALIN_ABAY.has(text[i - 1])) {
      out += "ı";
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Remove silent word-initial ayn (`) or hemze (') before a vowel
 * (e.g. `aleyhim -> aleyhim, 'ardı -> ardı) while preserving medial/final stops.
 */
function cleanInitialGlottal(subWord) {
  if (subWord.length >= 2 && (subWord[0] === "`" || subWord[0] === "'") && VOWELS.has(subWord[1])) {
    return subWord.slice(1);
  }
  return subWord;
}

/**
 * Turkish CV / CVC syllabification on single-codepoint Abay characters
 * (before expanding tajweed combining marks).
 */
function syllabifyAbaySubword(word) {
  const chars = [...word];
  if (chars.length < 2) return word;
  const vp = [];
  for (let i = 0; i < chars.length; i++) {
    if (VOWELS.has(chars[i])) vp.push(i);
  }
  if (vp.length <= 1) return word;
  const cuts = [];
  for (let p = 0; p < vp.length - 1; p++) {
    const i = vp[p];
    const j = vp[p + 1];
    cuts.push(j - i - 1 === 0 ? j : j - 1);
  }
  const parts = [];
  let start = 0;
  for (const c of cuts) {
    parts.push(chars.slice(start, c).join(""));
    start = c;
  }
  parts.push(chars.slice(start).join(""));
  return parts.join("-");
}

function syllabifyUnit(text, isMuk) {
  if (isMuk) {
    // Keep canonical mukattaa syllable hyphens (e.g., elif-lâm-mîm, kâf-hâ-yâ-ayn-sâd)
    return text.split("-").map(cleanInitialGlottal).join("-");
  }
  return text
    .split(" ")
    .map((sub) => syllabifyAbaySubword(cleanInitialGlottal(sub)))
    .join(" ");
}

function toTemel(text) {
  return text
    .replace(/g/g, "ğ")
    .replace(/ḳ/g, "k")
    .replace(/[ẕż]/g, "z")
    .replace(/[ŝṣ]/g, "s")
    .replace(/ḍ/g, "d")
    .replace(/ṭ/g, "t")
    .replace(/[ḥḫ]/g, "h")
    .replace(/`/g, "'");
}

function toTecvid(text) {
  return text
    .replace(/g/g, "ğ")
    .replace(/ḳ/g, "g")
    .replace(/ẕ/g, "z" + COMBINING_LOW_LINE)
    .replace(/ż/g, "z" + COMBINING_LOW_LINE + COMBINING_DOT_ABOVE)
    .replace(/ŝ/g, "s" + COMBINING_LOW_LINE)
    .replace(/ṣ/g, "s")
    .replace(/ḍ/g, "d" + COMBINING_DOT_ABOVE)
    .replace(/ṭ/g, "t" + COMBINING_DOT_ABOVE)
    .replace(/ḥ/g, "h" + COMBINING_MACRON)
    .replace(/ḫ/g, "h" + COMBINING_DOT_ABOVE)
    .replace(/`/g, "'");
}

/**
 * Convert a single verse into word-aligned Temel and Tecvid Turkish phonetic arrays.
 * @param {object} [options]
 * @param {"practical"|"classic"} [options.style="practical"]
 */
function convertVerseUnified(verseKey, arabicText, abayText, options = {}) {
  const style = options.style || "practical";
  const arWords = arabicText.split(" ");
  const aligned = alignAbayToArabic(verseKey, arWords, abayText);
  shiftLiaisonConsonants(arWords, aligned, style);
  detectIdgamLinks(arWords, aligned);

  const basic = [];
  const tajweed = [];

  for (const unit of aligned) {
    const withDotlessI = applyKalinDotlessI(unit.text);
    const syllabified = syllabifyUnit(withDotlessI, unit.isMukattaa);
    const suffix = unit.linkedNext ? "-" : "";
    basic.push(toTemel(syllabified) + suffix);
    tajweed.push(toTecvid(syllabified) + suffix);
  }

  return { basic, tajweed };
}

/**
 * Convert all 6,236 verses and produce a compact diff overlay for the Classic (Abay) style.
 */
function generateAllUnified(arabicData, abayMap) {
  const basicResult = {};
  const tajweedResult = {};
  const classicDiff = { b: {}, t: {} };
  let processed = 0;

  for (const [key, arabicText] of Object.entries(arabicData)) {
    const abayText = abayMap[key];
    if (!abayText) throw new Error(`Missing Muhammet Abay text for ${key}`);
    const practical = convertVerseUnified(key, arabicText, abayText, { style: "practical" });
    const classic = convertVerseUnified(key, arabicText, abayText, { style: "classic" });
    basicResult[key] = practical.basic;
    tajweedResult[key] = practical.tajweed;

    const bPatch = {};
    const tPatch = {};
    let hasB = false;
    let hasT = false;
    for (let i = 0; i < practical.basic.length; i++) {
      if (classic.basic[i] !== practical.basic[i]) {
        bPatch[i] = classic.basic[i];
        hasB = true;
      }
      if (classic.tajweed[i] !== practical.tajweed[i]) {
        tPatch[i] = classic.tajweed[i];
        hasT = true;
      }
    }
    if (hasB) classicDiff.b[key] = bPatch;
    if (hasT) classicDiff.t[key] = tPatch;
    processed++;
  }

  return { basicResult, tajweedResult, classicDiff, processed };
}

module.exports = {
  convertVerseUnified,
  generateAllUnified,
  alignAbayToArabic,
  applyKalinDotlessI,
  syllabifyAbaySubword,
  toTemel,
  toTecvid,
};
