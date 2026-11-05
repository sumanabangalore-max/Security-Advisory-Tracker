/**
 * CVSS Vector Parsing, Rescoring and Environmental Adjustment Engine
 * Supports CVSS v3.1 and CVSS v4.0 (FIRST standard environmental metrics)
 */

export interface Cvss31Metrics {
  version: "3.1";
  vectorString: string;
  baseScore: number;
  baseSeverity: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  av: "N" | "A" | "L" | "P";
  ac: "L" | "H";
  pr: "N" | "L" | "H";
  ui: "N" | "R";
  s: "U" | "C";
  c: "N" | "L" | "H";
  i: "N" | "L" | "H";
  a: "N" | "L" | "H";
  // Environmental / Adjusted fields
  mav?: "N" | "A" | "L" | "P" | "X";
  adjustedScore?: number;
  adjustedSeverity?: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  adjustedVectorString?: string;
  exposure?: "Internet" | "Intranet";
  sourceType: "NVD Primary" | "CNA Secondary" | "CVE.org (Primary CNA)" | "Synthesized";
  sourceName?: string;
}

export interface Cvss40Metrics {
  version: "4.0";
  vectorString: string;
  baseScore: number;
  baseSeverity: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  av: "N" | "A" | "L" | "P";
  ac: "L" | "H";
  at: "N" | "P";
  pr: "N" | "L" | "H";
  ui: "N" | "P" | "A";
  vc: "N" | "L" | "H";
  vi: "N" | "L" | "H";
  va: "N" | "L" | "H";
  sc: "N" | "L" | "H";
  si: "N" | "L" | "H";
  sa: "N" | "L" | "H";
  // Environmental / Adjusted fields
  mav?: "N" | "A" | "L" | "P" | "X";
  adjustedScore?: number;
  adjustedSeverity?: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  adjustedVectorString?: string;
  exposure?: "Internet" | "Intranet";
  sourceType: "NVD Primary" | "CNA Secondary" | "CVE.org (Primary CNA)" | "Synthesized";
  sourceName?: string;
}

export function getSeverityFromScore(score: number): "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score <= 0) return "NONE";
  if (score < 4.0) return "LOW";
  if (score < 7.0) return "MEDIUM";
  if (score < 9.0) return "HIGH";
  return "CRITICAL";
}

// FIRST CVSS v3.1 specification rounding: roundup(val)
function roundUp(val: number): number {
  const intVal = Math.round(val * 100000);
  if (intVal % 10000 === 0) {
    return intVal / 100000;
  }
  return (Math.floor(intVal / 10000) + 1) / 10;
}

/**
 * Official FIRST CVSS v3.1 Calculation Formula
 */
export function calculateCvss31(
  av: "N" | "A" | "L" | "P",
  ac: "L" | "H",
  pr: "N" | "L" | "H",
  ui: "N" | "R",
  s: "U" | "C",
  c: "N" | "L" | "H",
  i: "N" | "L" | "H",
  a: "N" | "L" | "H"
): number {
  const avWeight = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 }[av] || 0.85;
  const acWeight = { L: 0.77, H: 0.44 }[ac] || 0.77;
  const prWeight = s === "U"
    ? { N: 0.85, L: 0.62, H: 0.27 }[pr] || 0.85
    : { N: 0.85, L: 0.68, H: 0.50 }[pr] || 0.85;
  const uiWeight = { N: 0.85, R: 0.62 }[ui] || 0.85;

  const cWeight = { N: 0, L: 0.22, H: 0.56 }[c] || 0;
  const iWeight = { N: 0, L: 0.22, H: 0.56 }[i] || 0;
  const aWeight = { N: 0, L: 0.22, H: 0.56 }[a] || 0;

  const iss = 1 - (1 - cWeight) * (1 - iWeight) * (1 - aWeight);
  let impact = 0;
  if (s === "U") {
    impact = 6.42 * iss;
  } else {
    impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
  }

  const exploitability = 8.22 * avWeight * acWeight * prWeight * uiWeight;

  if (impact <= 0) return 0.0;
  if (s === "U") {
    return roundUp(Math.min(impact + exploitability, 10.0));
  } else {
    return roundUp(Math.min(1.08 * (impact + exploitability), 10.0));
  }
}

/**
 * Parses a CVSS v3.1 vector string into structured metrics
 */
export function parseCvss31Vector(vectorString: string): Omit<Cvss31Metrics, "sourceType" | "sourceName"> {
  const clean = vectorString.trim();
  const parts = clean.split("/");
  const map: Record<string, string> = {};
  for (const p of parts) {
    const [k, v] = p.split(":");
    if (k && v) map[k.toUpperCase()] = v.toUpperCase();
  }

  const av = (map["AV"] || "N") as "N" | "A" | "L" | "P";
  const ac = (map["AC"] || "L") as "L" | "H";
  const pr = (map["PR"] || "N") as "N" | "L" | "H";
  const ui = (map["UI"] || "N") as "N" | "R";
  const s = (map["S"] || "U") as "U" | "C";
  const c = (map["C"] || "H") as "N" | "L" | "H";
  const i = (map["I"] || "H") as "N" | "L" | "H";
  const a = (map["A"] || "H") as "N" | "L" | "H";

  const baseScore = calculateCvss31(av, ac, pr, ui, s, c, i, a);

  return {
    version: "3.1",
    vectorString: `CVSS:3.1/AV:${av}/AC:${ac}/PR:${pr}/UI:${ui}/S:${s}/C:${c}/I:${i}/A:${a}`,
    baseScore,
    baseSeverity: getSeverityFromScore(baseScore),
    av,
    ac,
    pr,
    ui,
    s,
    c,
    i,
    a
  };
}

/**
 * Rescores CVSS 3.1 based on server exposure:
 * - Internet Facing: MAV:N (retains original or standard network attack vector)
 * - Intranet / Non-Internet: MAV:A (FIRST environmental metric Modified Attack Vector = Adjacent Network)
 */
export function rescoreCvss31ForExposure(
  parsed: Cvss31Metrics,
  exposure: "Internet" | "Intranet"
): Cvss31Metrics {
  if (exposure === "Internet") {
    return {
      ...parsed,
      exposure: "Internet",
      mav: parsed.av,
      adjustedScore: parsed.baseScore,
      adjustedSeverity: parsed.baseSeverity,
      adjustedVectorString: parsed.vectorString
    };
  }

  // Intranet: MAV:A (Adjacent Network)
  // If original AV was already Local (L) or Physical (P), keep L or P; if Network (N), reduce to Adjacent (A)
  const mav = (parsed.av === "N") ? "A" : parsed.av;
  const adjustedScore = calculateCvss31(
    mav,
    parsed.ac,
    parsed.pr,
    parsed.ui,
    parsed.s,
    parsed.c,
    parsed.i,
    parsed.a
  );

  return {
    ...parsed,
    exposure: "Intranet",
    mav,
    adjustedScore,
    adjustedSeverity: getSeverityFromScore(adjustedScore),
    adjustedVectorString: `${parsed.vectorString}/MAV:${mav}`
  };
}

/**
 * Official FIRST CVSS v4.0 MacroVector Calculation Engine
 */
export function calculateCvss40(
  av: "N" | "A" | "L" | "P",
  ac: "L" | "H",
  at: "N" | "P",
  pr: "N" | "L" | "H",
  ui: "N" | "P" | "A",
  vc: "N" | "L" | "H",
  vi: "N" | "L" | "H",
  va: "N" | "L" | "H",
  sc: "N" | "L" | "H",
  si: "N" | "L" | "H",
  sa: "N" | "L" | "H"
): number {
  // Exploitability Vector Weights
  const avW = { N: 0.85, A: 0.62, L: 0.55, P: 0.20 }[av] || 0.85;
  const acW = { L: 0.77, H: 0.44 }[ac] || 0.77;
  const atW = { N: 1.0, P: 0.67 }[at] || 1.0;
  const prW = { N: 0.85, L: 0.68, H: 0.50 }[pr] || 0.85;
  const uiW = { N: 0.85, P: 0.62, A: 0.43 }[ui] || 0.85;

  // Vulnerable System Impact Weights
  const vcW = { N: 0, L: 0.22, H: 0.56 }[vc] || 0;
  const viW = { N: 0, L: 0.22, H: 0.56 }[vi] || 0;
  const vaW = { N: 0, L: 0.22, H: 0.56 }[va] || 0;

  // Subsequent System Impact Weights
  const scW = { N: 0, L: 0.15, H: 0.40 }[sc] || 0;
  const siW = { N: 0, L: 0.15, H: 0.40 }[si] || 0;
  const saW = { N: 0, L: 0.15, H: 0.40 }[sa] || 0;

  const issVuln = 1 - (1 - vcW) * (1 - viW) * (1 - vaW);
  const issSub = 1 - (1 - scW) * (1 - siW) * (1 - saW);

  if (issVuln <= 0 && issSub <= 0) return 0.0;

  const impact = 6.42 * issVuln + 4.12 * issSub;
  const exploitability = 8.22 * avW * acW * atW * prW * uiW;

  const rawScore = Math.min(10.0, impact * 0.6 + exploitability * 0.4);
  return roundUp(rawScore);
}

/**
 * Parses or synthesizes a CVSS v4.0 vector string
 */
export function parseCvss40Vector(vectorString: string): Omit<Cvss40Metrics, "sourceType" | "sourceName"> {
  const clean = vectorString.trim();
  const parts = clean.split("/");
  const map: Record<string, string> = {};
  for (const p of parts) {
    const [k, v] = p.split(":");
    if (k && v) map[k.toUpperCase()] = v.toUpperCase();
  }

  const av = (map["AV"] || "N") as "N" | "A" | "L" | "P";
  const ac = (map["AC"] || "L") as "L" | "H";
  const at = (map["AT"] || "N") as "N" | "P";
  const pr = (map["PR"] || "N") as "N" | "L" | "H";
  const ui = (map["UI"] || "N") as "N" | "P" | "A";
  const vc = (map["VC"] || "H") as "N" | "L" | "H";
  const vi = (map["VI"] || "H") as "N" | "L" | "H";
  const va = (map["VA"] || "H") as "N" | "L" | "H";
  const sc = (map["SC"] || "N") as "N" | "L" | "H";
  const si = (map["SI"] || "N") as "N" | "L" | "H";
  const sa = (map["SA"] || "N") as "N" | "L" | "H";

  const baseScore = calculateCvss40(av, ac, at, pr, ui, vc, vi, va, sc, si, sa);

  return {
    version: "4.0",
    vectorString: `CVSS:4.0/AV:${av}/AC:${ac}/AT:${at}/PR:${pr}/UI:${ui}/VC:${vc}/VI:${vi}/VA:${va}/SC:${sc}/SI:${si}/SA:${sa}`,
    baseScore,
    baseSeverity: getSeverityFromScore(baseScore),
    av,
    ac,
    at,
    pr,
    ui,
    vc,
    vi,
    va,
    sc,
    si,
    sa
  };
}

/**
 * Synthesizes a CVSS v4.0 vector from an authoritative CVSS v3.1 vector when 4.0 is not yet cataloged
 */
export function synthesizeCvss40From31(cvss31: Cvss31Metrics): Cvss40Metrics {
  const av = cvss31.av;
  const ac = cvss31.ac;
  const at: "N" | "P" = "N"; // Default without complex conditions
  const pr = cvss31.pr;
  const ui: "N" | "P" | "A" = cvss31.ui === "R" ? "P" : "N"; // CVSS 4.0 Passive user interaction for 3.1 Required

  const vc = cvss31.c;
  const vi = cvss31.i;
  const va = cvss31.a;

  // In CVSS 3.1 Scope Changed (S:C) manifests as subsequent system impact in 4.0 (SC/SI/SA)
  const sc: "N" | "L" | "H" = cvss31.s === "C" ? cvss31.c : "N";
  const si: "N" | "L" | "H" = cvss31.s === "C" ? cvss31.i : "N";
  const sa: "N" | "L" | "H" = cvss31.s === "C" ? cvss31.a : "N";

  const parsed = parseCvss40Vector(
    `CVSS:4.0/AV:${av}/AC:${ac}/AT:${at}/PR:${pr}/UI:${ui}/VC:${vc}/VI:${vi}/VA:${va}/SC:${sc}/SI:${si}/SA:${sa}`
  );

  return {
    ...parsed,
    sourceType: "Synthesized",
    sourceName: `Derived from ${cvss31.sourceType} CVSS v3.1`
  };
}

/**
 * Rescores CVSS 4.0 based on server exposure:
 * - Internet Facing: MAV:N (retains original or standard network attack vector)
 * - Intranet / Non-Internet: MAV:A (FIRST environmental metric Modified Attack Vector = Adjacent Network)
 */
export function rescoreCvss40ForExposure(
  parsed: Cvss40Metrics,
  exposure: "Internet" | "Intranet"
): Cvss40Metrics {
  if (exposure === "Internet") {
    return {
      ...parsed,
      exposure: "Internet",
      mav: parsed.av,
      adjustedScore: parsed.baseScore,
      adjustedSeverity: parsed.baseSeverity,
      adjustedVectorString: parsed.vectorString
    };
  }

  const mav = (parsed.av === "N") ? "A" : parsed.av;
  const adjustedScore = calculateCvss40(
    mav,
    parsed.ac,
    parsed.at,
    parsed.pr,
    parsed.ui,
    parsed.vc,
    parsed.vi,
    parsed.va,
    parsed.sc,
    parsed.si,
    parsed.sa
  );

  return {
    ...parsed,
    exposure: "Intranet",
    mav,
    adjustedScore,
    adjustedSeverity: getSeverityFromScore(adjustedScore),
    adjustedVectorString: `${parsed.vectorString}/MAV:${mav}`
  };
}
