const STOP = new Set("california charges charge charged charging file filed filing apply applies governs govern governed issue issues difference differences different between versus vs compared compare comparison similar alike same tell list every everyone\
  what which who whom whose when where why how is are was were be been being am do does did done can could shall should would will may might must i you he she it we they me him her us them my your his its our their this that these those a an the and or but if then than so as of in to for on at by with from into about over under again further once here there all any both each few more most other some such no nor not only own same too very just dont shouldnt now".split(" "));

export function termsOf(q: string): string[] {
  return [...new Set(q.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)))];
}

export interface ScoredSection {
  abbr: string;
  section: string;
  citation: string;
  text: string;
  history?: string;
  repealed?: boolean;
  score: number;
  structural?: string;
}

/** count word-boundary occurrences of t in hay (capped) */
function countTerm(hay: string, t: string): number {
  let n = 0;
  let i = hay.indexOf(t);
  while (i !== -1 && n < 6) {
    const before = i > 0 ? hay[i - 1] : " ";
    const after = i + t.length < hay.length ? hay[i + t.length] : " ";
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) n++;
    i = hay.indexOf(t, i + t.length);
  }
  return n;
}

// words that only name a code (e.g. "family", "code", "penal") match cross-references
// everywhere; they are noise once the search is narrowed to that code.
const CODE_TO_ABBR: Record<string, string> = {
  family: "FAM",
  penal: "PEN",
  civil: "CCP",
  government: "GOV",
  insurance: "INS",
  education: "EDC",
  evidence: "EVI",
  welfare: "WIC",
  business: "BPC",
  professions: "BPC",
  health: "HSC",
  safety: "HSC",
  revenue: "RTC",
  taxation: "RTC",
  vehicle: "VEH",
  water: "WAT",
  labor: "LAB",
  elections: "ELC",
  probate: "PRO",
  corporations: "CORP",
  financial: "FIN",
  commercial: "COM",
  food: "FAC",
  agricultural: "FAC",
  fish: "FGC",
  game: "FGC",
  utilities: "PUC",
  resources: "PRC",
};

const CODE_NAME_WORDS = new Set(
  [
    "family code",
    "penal code",
    "civil code",
    "government code",
    "code civil procedure",
    "code civil procedure",
    "civil procedure code",
    "insurance code",
    "education code",
    "evidence code",
    "welfare institutions code",
    "business professions code",
    "health safety code",
    "revenue taxation code",
    "vehicle code",
    "water code",
    "labor code",
    "elections code",
    "probate code",
    "streets highways code",
    "public contract code",
    "harbors navigation code",
    "military veterans code",
    "food agricultural code",
    "corporations code",
    "financial code",
    "unemployment insurance code",
    "commercial code",
    "fish game code",
    "public resources code",
    "public utilities code",
  ].join(" ")
    .split(" "),
);

export function scoreSections(
  queries: string[],
  records: Array<{ abbr: string; r: Record<string, unknown> }>,
  codePriority?: string[],
  limit = 24,
): ScoredSection[] {
  const qsets = queries.map((q) => ({
    raw: q.toLowerCase(),
    terms: termsOf(q).filter((t) => !CODE_NAME_WORDS.has(t)),
  }));
  // code names in the query imply a code priority
  const implied = queries
    .join(" ")
    .toLowerCase()
    .match(
      /\b(family|penal|civil|government|insurance|education|evidence|welfare|business|professions|health|safety|revenue|taxation|vehicle|water|labor|elections|probate|streets|highways|public\s+contract|harbors|navigation|military|veterans|food|agricultural|corporations|financial|commercial|fish|game|resources|utilities)\s+code\b/g,
    );
  const impliedCodes = implied
    ? [...new Set(implied.map((m) => CODE_TO_ABBR[m.replace(/\s+code$/, "").trim()] ?? "").filter(Boolean))]
    : [];
  const effectivePriority = codePriority?.length
    ? codePriority
    : impliedCodes.length
      ? impliedCodes
      : codePriority;
  const allTerms = [...new Set(qsets.flatMap((q) => q.terms))];
  const out: Array<{ abbr: string; r: Record<string, unknown>; score: number }> = [];
  for (const { abbr, r } of records) {
    if (r.kind !== "section" || !r.text) continue;
    const structuralParts = [r.division, r.part, r.chapter, r.article]
      .map((x) => String(x || ""))
      .filter(Boolean);
    const structural = structuralParts.join(" ");
    const hay = (
      String(r.citation || "") + " " + structural + " " + String(r.text)
    ).toLowerCase();
    const lastStructural = (structuralParts[structuralParts.length - 1] || "").toLowerCase();
    const textLower = String(r.text || "").toLowerCase();
    const citation = String(r.citation || "").toLowerCase();
    const isDefinition =
      textLower.includes("means any of the following") ||
      /[\u201c"][^\u201d"]{1,60}[\u201d"]\s+means\s/.test(textLower);
    let score = 0;
    for (const q of qsets) {
      // phrase bonus only for 3+ word phrases (short phrases are cross-reference noise)
      if (q.raw.length > 3 && q.raw.split(" ").length >= 3 && hay.includes(q.raw)) score += 36;
      for (const t of q.terms) {
        if (citation.includes(t)) score += 12;
        // a term in the section's MOST SPECIFIC structural heading (e.g.
        // chapter "2. Burglary") marks the section that houses the law on
        // that term — outranking sections that merely enumerate it in a list
        if (lastStructural.includes(t)) score += 18;
        const stem = t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t;
        const n = Math.max(countTerm(hay, t), countTerm(hay, stem));
        if (n > 0) {
          score += Math.min(10, t.length + 3); // first occurrence
          score += Math.min(12, (n - 1) * 4); // repeat occurrences signal topicality
        } else if (hay.includes(t)) score += Math.min(5, t.length);
      }
    }
    // the section that DEFINES a queried term ("abuse" means ...) outranks
    // sections that merely mention the term repeatedly
    const definesQueriedTerm = allTerms.some(
      (t) =>
        textLower.includes("\u201c" + t + "\u201d means") ||
        textLower.includes('"' + t + '" means') ||
        textLower.includes(t + " means any of the following") ||
        // Penal-Code-style definition openers: "is guilty of burglary.",
        // "Robbery is the felonious taking"
        textLower.includes("guilty of " + t) ||
        textLower.startsWith(t + " is the") ||
        textLower.includes(". " + t + " is the") ||
        textLower.includes(") " + t + " is the"),
    );
    if (score > 0) {
      if (
        (isDefinition || definesQueriedTerm) &&
        qsets.some((q) => /defin|what is|element|meaning|list|include/.test(q.raw))
      ) {
        score += 6;
      }
      if (definesQueriedTerm) score += 85;
      if (effectivePriority && effectivePriority.includes(abbr)) score += 25;
      if (r.repealed) score -= 8;
      out.push({ abbr, r, score });
    }
  }
  out.sort((a, b) => b.score - a.score);
  const res: ScoredSection[] = [];
  const perCode: Record<string, number> = {};
  for (const o of out) {
    if (res.length >= limit) break;
    perCode[o.abbr] = (perCode[o.abbr] || 0) + 1;
    if (perCode[o.abbr] > 6) continue;
    res.push({
      abbr: o.abbr,
      section: String(o.r.section || ""),
      citation: String(o.r.citation || (o.abbr + " § " + o.r.section) || ""),
      text: String(o.r.text || "").slice(0, 1600),
      history: o.r.history ? String(o.r.history).slice(0, 200) : undefined,
      repealed: Boolean(o.r.repealed),
      score: o.score,
      structural: [
        o.r.division, o.r.part, o.r.chapter, o.r.article,
      ]
        .map((x) => String(x || ""))
        .filter(Boolean)
        .join(" > "),
    });
  }
  return res;
}

const MEASURE_RE = /\b(?:ab|sb|aca|sca|acr|scr|ajr|sjr|ar|sr|hr|grp)\s*-?\s*\d{1,4}\b/gi;
export function measuresIn(q: string): string[] {
  const out: string[] = [];
  for (const m of String(q).match(MEASURE_RE) || []) out.push(m.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
  return out;
}

const RULE_RE = /\brules?\s*(\d+(?:\.\d+){0,2})\b/gi;
export function ruleNumsIn(q: string): string[] {
  const out: string[] = [];
  for (const m of String(q).match(RULE_RE) || []) {
    const n = m.replace(/.*?(\d)/, "$1");
    if (n) out.push(n);
  }
  return out;
}

/* ---------- Judicial Council forms ---------- */

// Form numbers look like FL-100, MC-025, JV-101(A), ADOPT-050-INFO, SC-104B,
// CH-100-INFO, CP10.5, GDC-001 — a 2-6 letter series, digits, and an optional
// lettered/attachment suffix. Spaces are tolerated ("FL 100").
const FORM_NUM_RE =
  /\b(?:CP10(?:\.5)?|[A-Z]{2,6}[-\s]?\d{1,4}[A-Z]?(?:\.\d+)?(?:-[A-Z]{2,6})?(?:\([A-Z0-9]{1,3}\))?)(?![A-Za-z0-9])/g;

/** Normalize a form number: "fl 100" -> "FL-100", "jv 101(a)" -> "JV-101(A)" */
export function normalizeFormNumber(raw: string): string {
  return String(raw)
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/^([A-Z]+)-?(\d)/, "$1-$2");
}

/** Pull Judicial Council form numbers out of a query ("form FL 100", "DV-110") */
export function formNumsIn(q: string): string[] {
  const out: string[] = [];
  for (const m of String(q).toUpperCase().match(FORM_NUM_RE) || []) {
    const n = normalizeFormNumber(m);
    if (/\d/.test(n)) out.push(n);
  }
  return [...new Set(out)];
}

export interface ScoredForm {
  number: string;
  title: string;
  category?: string;
  prefix?: string;
  mandatory?: boolean;
  effective?: string;
  description?: string;
  pdf_url?: string;
  info_url?: string;
  languages?: string[];
  language_urls?: Record<string, string>;
  score: number;
}

/** Cheap stemming so "waiver" matches "waive", "fees" matches "fee", ... */
/**
 * Form family used for grouping and prefix filtering ("FL-1XX" -> "FL",
 * "CP10" -> "CP"). Corpus records carry `series`; derive it as a fallback.
 */
export function formSeries(f: { series?: string; prefix?: string; number?: string }): string {
  if (f.series) return String(f.series).toUpperCase();
  const prefix = String(f.prefix || "").toUpperCase();
  const head = prefix.split("-")[0];
  if (head && /^[A-Z]+$/.test(head)) return head;
  const m = String(f.number || "").toUpperCase().match(/^([A-Z]+)/);
  return m ? m[1] : prefix;
}

function stemsOf(t: string): string[] {
  const out = [t];
  const variants = [
    t.replace(/ies$/, "y").replace(/(es|s)$/, ""),
    t.replace(/(ing|ed|ion|ions|er|ers|ship|ment|ness|ity|ities|ance|ence|able|ible)$/, ""),
    t.replace(/e$/, ""),
  ];
  for (const v of variants) if (v.length >= 3 && !out.includes(v)) out.push(v);
  return out;
}

function matchesTerm(hay: string, t: string): boolean {
  return stemsOf(t).some((stem) => hay.includes(stem));
}

// secondary/administrative forms — "order on ... after hearing", "notice to
// appear for reconsideration" — demoted unless the query asks for them
// Topic -> canonical form series. A hit gives the series' forms a small boost
// so "proof of service" surfaces the POS family and "divorce" the FL family.
const SERIES_HINTS: Array<[RegExp, string]> = [
  [/\bproof of service|service of process\b/i, "POS"],
  [/\bfee waiver|waive (the )?court fees\b/i, "FW"],
  [/\bunlawful detainer|eviction\b/i, "UD"],
  [/\bsmall claims\b/i, "SC"],
  [/\bname change\b/i, "NC"],
  [/\bdomestic violence|restraining order\b/i, "DV"],
  [/\bcivil harassment\b/i, "CH"],
  [/\bguardianship|guardian of (a|the) (minor|person)\b/i, "GC"],
  [/\bdecedent|probate|estate of a deceased\b/i, "DE"],
  [/\badoption|adopt a child\b/i, "ADOPT"],
  [/\btraffic (ticket|citation|court|violator)\b/i, "TR"],
  [/\bexpung|dismiss (a|my) conviction|clean (my )?record\b/i, "CR"],
  [/\bdissolution of marriage|divorce\b/i, "FL"],
  [/\bchild custody|visitation\b/i, "FL"],
  [/\belder abuse\b/i, "EA"],
  [/\bworkplace violence\b/i, "WV"],
  [/\bgun violence\b/i, "GV"],
  [/\bappeal|appellate\b/i, "APP"],
  [/\bdiscovery|interrogator|subpoena\b/i, "DISC"],
  [/\bjuvenile\b/i, "JV"],
  [/\bwage garnishment\b/i, "WG"],
  [/\bsummons\b/i, "SUM"],
];

const SECONDARY_FORM_RE =
  /^(attachment to|order on|order after|notice to appear|instructions for|information sheet|confidential cover sheet|application to file documents under seal|declaration in support|what is|how to|can a|can i|can your)\b/i;
const SECONDARY_QUERY_RE =
  /\b(order|notice|instruction|information|how to|after hearing|reconsider|renew|terminate|modify|change|end|respond|response|answer|enforce|collect|cover sheet|attachment|declaration)\b/i;

/**
 * Score Judicial Council forms against the query set. A form-number hit
 * dominates (FL-100 must return FL-100 first); then coverage of the query in
 * the title, the literal title wording, the topic category, and finally the
 * plain-language description. Instruction sheets ("-INFO") and secondary
 * "after hearing / reconsideration" forms are demoted unless the query asks
 * for them, and series-canonical forms (‑100 / ‑001) get a small boost.
 */
export function scoreForms(
  queries: string[],
  forms: Array<Record<string, unknown>>,
  limit = 12,
): ScoredForm[] {
  const qsets = queries.map((q) => {
    const terms = termsOf(q).filter((t) => !CODE_NAME_WORDS.has(t));
    return {
      terms,
      nums: formNumsIn(q).map((n) => n.toLowerCase()),
      phrase: q.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(),
      wantsInfo: /\binfo|instruction|instructions|explain|how to|guide|help\b/i.test(q),
      wantsSecondary: SECONDARY_QUERY_RE.test(q),
    hintedSeries: SERIES_HINTS.filter(([re]) => re.test(q)).map(([, prefix]) => prefix),
    };
  });
  const out: Array<ScoredForm & { coverage: number }> = [];
  for (const f of forms) {
    const number = String(f.number || "");
    const num = number.toLowerCase();
    const title = String(f.title || "").toLowerCase();
    const desc = String(f.description || "").toLowerCase();
    const cat = String(f.category || "").toLowerCase();
    let score = 0;
    let bestCoverage = 0;
    for (const q of qsets) {
      for (const n of q.nums) {
        if (n === num) score += 240;
        else if (num.startsWith(n)) score += 70;
        else if (n.startsWith(num)) score += 40;
      }
      if (q.phrase.length > 3 && q.phrase.includes(num)) score += 180;

      let titleHits = 0;
      let descHits = 0;
      let catHits = 0;
      for (const t of q.terms) {
        if (matchesTerm(title, t)) titleHits++;
        if (matchesTerm(cat, t)) catHits++;
        if (matchesTerm(desc, t)) descHits++;
      }
      const total = Math.max(1, q.terms.length);
      const coverage = Math.min(
        1,
        (titleHits + Math.min(descHits, total) * 0.4 + Math.min(catHits, total) * 0.3) / total,
      );
      if (titleHits) score += Math.round(100 * (titleHits / total)) + (titleHits === total ? 10 : 0);
      if (descHits) score += Math.round(12 * (descHits / total));
      if (catHits) score += Math.round(10 * (catHits / total));
      if (q.phrase.length > 3) {
        if (title.includes(q.phrase)) score += 15;
        else if (desc.includes(q.phrase)) score += 8;
      }
      if (num.includes(q.phrase.replace(/[^a-z0-9]/g, ""))) score += 20;
      if (!q.wantsInfo && /-info$/i.test(number)) score -= 20;
      if (!q.wantsSecondary && SECONDARY_FORM_RE.test(title)) score -= 15;
      if (/(^|-)(001|100)(-|$)/.test(num)) score += 25;
      if (q.hintedSeries.includes(formSeries(f as { series?: string; prefix?: string; number?: string }))) score += 20;
      if (coverage > bestCoverage) bestCoverage = coverage;
    }
    if (score > 0) out.push({ ...(f as Omit<ScoredForm, "score">), number, title, score, coverage: bestCoverage });
  }
  out.sort(
    (a, b) =>
      b.score - a.score ||
      b.coverage - a.coverage ||
      a.title.split(/\s+/).length - b.title.split(/\s+/).length ||
      a.number.localeCompare(b.number, undefined, { numeric: true }),
  );
  return out.slice(0, limit).map(({ coverage: _coverage, ...form }) => form);
}
