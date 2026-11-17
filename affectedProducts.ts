export type AffectedSourceTag = "NVD" | "CNA" | "CISA" | "OSV";

export interface AffectedVersionRange {
  affected_version: string;
  fixed_in: string | null;
  sources: AffectedSourceTag[];
}

export interface AffectedProductEntry {
  vendor: string;
  product: string;
  ranges: AffectedVersionRange[];
  sources: AffectedSourceTag[];
  listed_by: string;
}

export interface AffectedSourcesStatus {
  nvd: { checked: boolean; reachable: boolean; count: number };
  cna: { checked: boolean; reachable: boolean; count: number };
  cisa: { checked: boolean; reachable: boolean; count: number };
  osv: { checked: boolean; reachable: boolean; count: number };
}

interface RawAffectedItem {
  vendor: string;
  product: string;
  ranges: { affected_version: string; fixed_in: string | null }[];
  source: AffectedSourceTag;
}

const KNOWN_VENDOR_DISPLAY: Record<string, string> = {
  paloaltonetworks: "Palo Alto Networks",
  microsoft: "Microsoft",
  google: "Google",
  apple: "Apple",
  redhat: "Red Hat",
  "red hat": "Red Hat",
  apache: "Apache",
  canonical: "Canonical",
  ubuntu: "Ubuntu",
  debian: "Debian",
  linux: "Linux",
  linuxfoundation: "Linux Foundation",
  fedoraproject: "Fedora Project",
  cisco: "Cisco",
  fortinet: "Fortinet",
  vmware: "VMware",
  oracle: "Oracle",
  ibm: "IBM",
  mozilla: "Mozilla",
  openssl: "OpenSSL",
  nginx: "NGINX",
  postgresql: "PostgreSQL",
  nodejs: "Node.js",
  github: "GitHub",
  tukaani: "Tukaani",
  tukaaniproject: "Tukaani Project",
  opencontainers: "OpenContainers",
  openbsd: "OpenBSD",
  openssh: "OpenSSH",
  siemens: "Siemens",
  f5: "F5",
  juniper: "Juniper",
  ivanti: "Ivanti",
  citrix: "Citrix",
  atlassian: "Atlassian",
  jetbrains: "JetBrains",
  docker: "Docker",
  kubernetes: "Kubernetes"
};

function decodeCpeEscapes(str: string): string {
  return str.replace(/\\([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~-])/g, "$1");
}

function prettifyToken(raw: string, isVendor = false): string {
  const cleaned = decodeCpeEscapes(raw).replace(/_/g, " ").trim();
  if (!cleaned) return "";
  const compactKey = cleaned.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (isVendor && KNOWN_VENDOR_DISPLAY[compactKey]) {
    return KNOWN_VENDOR_DISPLAY[compactKey];
  }
  if (/[A-Z]/.test(cleaned)) return cleaned;
  if (cleaned.includes("-") && cleaned.length <= 8) {
    return cleaned.toUpperCase();
  }
  return cleaned
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function splitCpe23(cpe: string): string[] {
  const parts: string[] = [];
  let current = "";
  for (let i = 0; i < cpe.length; i++) {
    if (cpe[i] === "\\" && i + 1 < cpe.length) {
      current += cpe[i] + cpe[i + 1];
      i++;
    } else if (cpe[i] === ":") {
      parts.push(current);
      current = "";
    } else {
      current += cpe[i];
    }
  }
  parts.push(current);
  return parts;
}

function extractVendorFromUrl(url?: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    if (u.hostname.includes("github.com") && segments.length >= 1) {
      return prettifyToken(segments[0], true);
    }
    if (u.hostname.includes("redhat.com")) return "Red Hat";
    if (u.hostname.includes("openssh.com")) return "OpenBSD";
    return "";
  } catch {
    return "";
  }
}

function extractProductFromUrl(url?: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    if (u.hostname.includes("github.com") && segments.length >= 2) {
      return segments[1].replace(/\.git$/i, "");
    }
    return "";
  } catch {
    return "";
  }
}

function extractVendorFromCpes(cpes?: string[]): string {
  if (!Array.isArray(cpes) || cpes.length === 0) return "";
  for (const c of cpes) {
    const parts = splitCpe23(c);
    if (parts[0] === "cpe" && parts[1] === "2.3" && parts[3] && parts[3] !== "*") {
      return prettifyToken(parts[3], true);
    }
    if (parts[0] === "cpe" && parts[1]?.startsWith("/") && parts[2]) {
      return prettifyToken(parts[2], true);
    }
  }
  return "";
}

function extractProductFromCpes(cpes?: string[]): string {
  if (!Array.isArray(cpes) || cpes.length === 0) return "";
  for (const c of cpes) {
    const parts = splitCpe23(c);
    if (parts[0] === "cpe" && parts[1] === "2.3" && parts[4] && parts[4] !== "*") {
      return prettifyToken(parts[4], false);
    }
    if (parts[0] === "cpe" && parts[1]?.startsWith("/") && parts[3]) {
      return prettifyToken(parts[3], false);
    }
  }
  return "";
}

function normalizeInlineRangeExpression(ver: string): string {
  // Normalize ">=v1.0.0-rc93, < 1.1.12" -> "v1.0.0-rc93 – < 1.1.12"
  const m = ver.match(/^>=\s*([^\s,]+)\s*,\s*(<=?\s*[^\s,]+)$/);
  if (m) {
    return `${m[1]} – ${m[2].replace(/\s+/g, " ")}`;
  }
  return ver;
}

/**
 * 1. Extract Affected Products from NIST NVD API 2.0 `configurations` (CPE list)
 */
export function extractFromNvdConfigurations(configurations: any[]): RawAffectedItem[] {
  if (!Array.isArray(configurations)) return [];
  const items: RawAffectedItem[] = [];

  for (const config of configurations) {
    for (const node of config?.nodes || []) {
      if (node?.negate === true) continue;
      for (const cpe of node?.cpeMatch || []) {
        if (cpe?.vulnerable === false) continue;
        if (!cpe?.criteria) continue;

        const parts = splitCpe23(cpe.criteria);
        if (parts.length < 5) continue;

        const rawVendor = parts[3] && parts[3] !== "*" && parts[3] !== "-" ? parts[3] : "";
        const rawProduct = parts[4] && parts[4] !== "*" && parts[4] !== "-" ? parts[4] : "";
        if (!rawProduct) continue;

        const vendor = rawVendor ? prettifyToken(rawVendor, true) : "Unspecified";
        const product = prettifyToken(rawProduct, false);

        const cpeVer = parts[5] && parts[5] !== "*" && parts[5] !== "-" ? decodeCpeEscapes(parts[5]) : "";
        const cpeUpd = parts[6] && parts[6] !== "*" && parts[6] !== "-" ? decodeCpeEscapes(parts[6]) : "";

        const startInc = cpe.versionStartIncluding ? String(cpe.versionStartIncluding).trim() : "";
        const startExc = cpe.versionStartExcluding ? String(cpe.versionStartExcluding).trim() : "";
        const endExc = cpe.versionEndExcluding ? String(cpe.versionEndExcluding).trim() : "";
        const endInc = cpe.versionEndIncluding ? String(cpe.versionEndIncluding).trim() : "";

        let affectedVersion = "";
        const fixedIn: string | null = endExc || null;

        if (startInc || startExc || endExc || endInc) {
          if (startInc && endExc) {
            affectedVersion = `${startInc} – < ${endExc}`;
          } else if (startInc && endInc) {
            affectedVersion = `${startInc} – <= ${endInc}`;
          } else {
            const segs: string[] = [];
            if (startInc) segs.push(`>= ${startInc}`);
            if (startExc) segs.push(`> ${startExc}`);
            if (endExc) segs.push(`< ${endExc}`);
            if (endInc) segs.push(`<= ${endInc}`);
            affectedVersion = segs.join(", ");
          }
        } else if (cpeVer) {
          affectedVersion = cpeUpd ? `${cpeVer}-${cpeUpd}` : cpeVer;
        } else {
          affectedVersion = "All versions";
        }

        items.push({
          vendor,
          product,
          ranges: [{ affected_version: affectedVersion, fixed_in: fixedIn }],
          source: "NVD"
        });
      }
    }
  }

  return items;
}

/**
 * 2 & 3. Extract Affected Products from CVE.org JSON 5.x `affected` array
 * Used for both CNA (`containers.cna.affected`) and CISA (`containers.adp[CISA].affected`)
 */
export function extractFromCve5Affected(
  affectedList: any[],
  sourceTag: "CNA" | "CISA"
): RawAffectedItem[] {
  if (!Array.isArray(affectedList)) return [];
  const items: RawAffectedItem[] = [];

  for (const entry of affectedList) {
    if (!entry) continue;
    const rawVendor =
      entry.vendor?.trim() ||
      extractVendorFromUrl(entry.collectionURL || entry.repo) ||
      extractVendorFromCpes(entry.cpes) ||
      "Unspecified";
    const vendor = prettifyToken(rawVendor, true) || "Unspecified";

    const rawProduct =
      entry.product?.trim() ||
      entry.packageName?.trim() ||
      extractProductFromCpes(entry.cpes) ||
      "";
    if (!rawProduct) continue;
    const product = rawProduct;

    const defaultStatus = String(entry.defaultStatus || "").toLowerCase();
    const versions = Array.isArray(entry.versions) ? entry.versions : [];
    const ranges: { affected_version: string; fixed_in: string | null }[] = [];

    if (versions.length === 0) {
      if (defaultStatus === "unaffected") continue;
      ranges.push({
        affected_version: defaultStatus === "affected" ? "All versions" : "Unspecified",
        fixed_in: null
      });
    } else {
      const affectedItems = versions.filter(
        (v: any) => String(v?.status || defaultStatus).toLowerCase() === "affected"
      );

      for (const v of affectedItems) {
        const ver = v.version !== undefined && v.version !== null ? String(v.version).trim() : "";
        const rawLessThan = v.lessThan ? String(v.lessThan).trim() : "";
        const rawLte = v.lessThanOrEqual ? String(v.lessThanOrEqual).trim() : "";

        const unaffectedChanges: string[] = Array.isArray(v.changes)
          ? v.changes
              .filter((c: any) => String(c?.status || "").toLowerCase() === "unaffected" && c?.at)
              .map((c: any) => String(c.at).trim())
          : [];

        const realLessThan =
          rawLessThan && rawLessThan !== "*" && !rawLessThan.endsWith("*")
            ? rawLessThan
            : "";
        const realLte = rawLte && rawLte !== "*" && !rawLte.endsWith("*") ? rawLte : "";

        let inlineFixed = "";
        if (!realLessThan && ver) {
          const m = ver.match(/(?:^|[,\s])<\s*([vV]?\d[a-zA-Z0-9._\-+~:]*)/);
          if (m && m[1]) {
            inlineFixed = m[1].trim();
          }
        }

        const fixedList: string[] = [];
        if (realLessThan) fixedList.push(realLessThan);
        for (const ch of unaffectedChanges) {
          if (!fixedList.includes(ch)) fixedList.push(ch);
        }
        if (inlineFixed && !fixedList.includes(inlineFixed)) {
          fixedList.push(inlineFixed);
        }
        const fixedIn = fixedList.length > 0 ? fixedList.join(", ") : null;

        let affectedVersion = "";
        if (ver === "0" && realLessThan) {
          affectedVersion = `< ${realLessThan}`;
        } else if (ver === "0" && realLte) {
          affectedVersion = `<= ${realLte}`;
        } else if (ver && realLessThan && ver === realLessThan) {
          affectedVersion = `< ${realLessThan}`;
        } else if (ver && realLessThan) {
          affectedVersion = `${ver} – < ${realLessThan}`;
        } else if (ver && realLte) {
          affectedVersion = `${ver} – <= ${realLte}`;
        } else if (ver && unaffectedChanges.length === 1) {
          affectedVersion = `${ver} – < ${unaffectedChanges[0]}`;
        } else if (ver && unaffectedChanges.length > 1) {
          affectedVersion = `>= ${ver} (multiple branches)`;
        } else if (ver) {
          affectedVersion = ver === "*" ? "All versions" : normalizeInlineRangeExpression(ver);
        } else {
          affectedVersion = "All versions";
        }

        ranges.push({ affected_version: affectedVersion, fixed_in: fixedIn });
      }

      if (affectedItems.length === 0 && defaultStatus === "affected") {
        const unaffectedFixed = versions.filter(
          (v: any) =>
            String(v?.status || "").toLowerCase() === "unaffected" &&
            v?.version &&
            (v.lessThan === "*" || v.lessThanOrEqual === "*" || !v.lessThan)
        );
        for (const u of unaffectedFixed) {
          const uVer = String(u.version).trim();
          ranges.push({
            affected_version: `< ${uVer}`,
            fixed_in: uVer
          });
        }
      }

      if (ranges.length === 0) continue;
    }

    items.push({
      vendor,
      product,
      ranges,
      source: sourceTag
    });
  }

  return items;
}

function isCommitHash(val: string): boolean {
  return /^[0-9a-f]{32,40}$/i.test(val.trim());
}

function parseOsvEvents(
  events: any[],
  allowCommitHashes = false
): { affected_version: string; fixed_in: string | null }[] {
  if (!Array.isArray(events) || events.length === 0) return [];
  const results: { affected_version: string; fixed_in: string | null }[] = [];
  let currentIntro: string | null = null;

  for (const ev of events) {
    if (ev.introduced !== undefined) {
      const val = String(ev.introduced).trim();
      if (!allowCommitHashes && isCommitHash(val)) continue;
      currentIntro = allowCommitHashes && isCommitHash(val) ? val.slice(0, 7) : val;
    } else if (ev.fixed !== undefined) {
      const rawFix = String(ev.fixed).trim();
      if (!allowCommitHashes && isCommitHash(rawFix)) {
        currentIntro = null;
        continue;
      }
      const fix = allowCommitHashes && isCommitHash(rawFix) ? `commit ${rawFix.slice(0, 7)}` : rawFix;
      const introDisplay = currentIntro && currentIntro !== "0"
        ? (allowCommitHashes && /^[0-9a-f]{7}$/i.test(currentIntro) ? `commit ${currentIntro}` : currentIntro)
        : "";
      results.push({
        affected_version: introDisplay ? `${introDisplay} – < ${fix}` : `< ${fix}`,
        fixed_in: fix
      });
      currentIntro = null;
    } else if (ev.last_affected !== undefined) {
      const rawLast = String(ev.last_affected).trim();
      if (!allowCommitHashes && isCommitHash(rawLast)) {
        currentIntro = null;
        continue;
      }
      const last = allowCommitHashes && isCommitHash(rawLast) ? `commit ${rawLast.slice(0, 7)}` : rawLast;
      const introDisplay = currentIntro && currentIntro !== "0"
        ? (allowCommitHashes && /^[0-9a-f]{7}$/i.test(currentIntro) ? `commit ${currentIntro}` : currentIntro)
        : "";
      let affectedStr = "";
      if (introDisplay && introDisplay === last) {
        affectedStr = last;
      } else if (introDisplay) {
        affectedStr = `${introDisplay} – <= ${last}`;
      } else {
        affectedStr = `<= ${last}`;
      }
      results.push({
        affected_version: affectedStr,
        fixed_in: null
      });
      currentIntro = null;
    }
  }

  if (currentIntro !== null) {
    results.push({
      affected_version: currentIntro === "0" ? "All versions" : `>= ${currentIntro}`,
      fixed_in: null
    });
  }

  return results;
}

/**
 * 4. Extract Affected Products from OSV.dev `affected` array (open-source packages)
 */
export function extractFromOsvAffected(affectedList: any[]): RawAffectedItem[] {
  if (!Array.isArray(affectedList)) return [];
  const items: RawAffectedItem[] = [];

  for (const entry of affectedList) {
    if (!entry) continue;
    const pkg = entry.package;
    const repoUrl = (entry.ranges || []).find((r: any) => r?.repo)?.repo;
    const vendor =
      pkg?.ecosystem ||
      extractVendorFromUrl(repoUrl) ||
      "Open Source";
    const product =
      pkg?.name ||
      extractProductFromUrl(repoUrl) ||
      "";
    if (!product) continue;

    const ranges: { affected_version: string; fixed_in: string | null }[] = [];
    const entryRanges = Array.isArray(entry.ranges) ? entry.ranges : [];

    for (const r of entryRanges) {
      if (r?.type === "ECOSYSTEM" || r?.type === "SEMVER") {
        ranges.push(...parseOsvEvents(r.events || [], false));
      }
    }

    if (ranges.length === 0) {
      for (const r of entryRanges) {
        const extracted = r?.database_specific?.extracted_events;
        if (Array.isArray(extracted)) {
          for (const ex of extracted) {
            if (Array.isArray(ex?.range)) {
              ranges.push(...parseOsvEvents(ex.range, false));
            }
          }
        }
      }
    }

    if (ranges.length === 0 && Array.isArray(entry.versions) && entry.versions.length > 0) {
      const vers = entry.versions.map((v: any) => String(v).trim()).filter(Boolean);
      const summary =
        vers.length <= 5
          ? vers.join(", ")
          : `${vers[0]} – ${vers[vers.length - 1]} (${vers.length} versions)`;
      ranges.push({ affected_version: summary, fixed_in: null });
    }

    if (ranges.length === 0) {
      for (const r of entryRanges) {
        if (r?.type === "GIT") {
          ranges.push(...parseOsvEvents(r.events || [], true));
        }
      }
    }

    if (ranges.length === 0) {
      ranges.push({ affected_version: "Unspecified", fixed_in: null });
    }

    items.push({
      vendor: prettifyToken(vendor, true) || vendor,
      product,
      ranges,
      source: "OSV"
    });
  }

  return items;
}

function normStr(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normVendor(v: string): string {
  let s = v.toLowerCase();
  s = s
    .replace(/\b(software foundation|inc\.?|incorporated|corp\.?|corporation|llc|ltd\.?|limited|gmbh|project|foundation|group|org)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
  return s;
}

function isGenericVendor(v: string): boolean {
  const n = normStr(v);
  return (
    !n ||
    n === "unspecified" ||
    n === "unknown" ||
    n === "opensource" ||
    n === "github" ||
    n === "linuxfoundation" ||
    n === "pypi" ||
    n === "npm" ||
    n === "go" ||
    n === "maven" ||
    n === "cratesio" ||
    n === "nuget" ||
    n === "rubygems" ||
    n === "packagist"
  );
}

function vendorsCompatible(v1: string, v2: string): boolean {
  if (isGenericVendor(v1) || isGenericVendor(v2)) return true;
  const n1 = normVendor(v1);
  const n2 = normVendor(v2);
  if (!n1 || !n2) return true;
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;
  return false;
}

function stripVendorPrefix(prodNorm: string, vendorNorm: string): string {
  if (vendorNorm && prodNorm.startsWith(vendorNorm) && prodNorm.length > vendorNorm.length) {
    return prodNorm.slice(vendorNorm.length);
  }
  return prodNorm;
}

function rangesShareFixedVersion(
  r1: { fixed_in: string | null }[],
  r2: { fixed_in: string | null }[]
): boolean {
  const f1 = r1.map((x) => x.fixed_in?.toLowerCase().trim()).filter(Boolean) as string[];
  const f2 = r2.map((x) => x.fixed_in?.toLowerCase().trim()).filter(Boolean) as string[];
  return f1.some((v) => f2.includes(v));
}

function productsMatch(
  existing: AffectedProductEntry,
  incoming: RawAffectedItem
): boolean {
  const np1 = normStr(existing.product);
  const np2 = normStr(incoming.product);
  if (!np1 || !np2) return false;

  const s1 = stripVendorPrefix(np1, normVendor(existing.vendor));
  const s2 = stripVendorPrefix(np2, normVendor(incoming.vendor));
  const sameProd = np1 === np2 || (Boolean(s1 && s2) && s1 === s2);
  if (!sameProd) return false;

  if (vendorsCompatible(existing.vendor, incoming.vendor)) return true;
  if (rangesShareFixedVersion(existing.ranges, incoming.ranges)) return true;
  return false;
}

const SOURCE_ORDER: AffectedSourceTag[] = ["NVD", "CNA", "CISA", "OSV"];

export function formatListedBy(sources: AffectedSourceTag[]): string {
  const ordered = SOURCE_ORDER.filter((s) => sources.includes(s));
  if (ordered.length === 0) return "Unknown";
  if (ordered.length === 1) return ordered[0];
  if (ordered.length === 2) return `Both ${ordered[0]} and ${ordered[1]}`;
  return `${ordered.slice(0, -1).join(", ")} & ${ordered[ordered.length - 1]}`;
}

function normVersionCompare(val: string | null): string {
  if (!val) return "";
  return val
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[–—]/g, "-")
    .replace(/^(>=)?v(?=\d)/, "$1");
}

function collapseEnumeratedRanges(ranges: AffectedVersionRange[]): AffectedVersionRange[] {
  // If there are explicit bounded ranges with `fixed_in` AND a large tail (>6) of unfixed single point CPEs from NVD,
  // collapse the unfixed NVD point versions into a clean summary entry so the table stays scannable.
  const pointUnfixedNvd = ranges.filter(
    (r) =>
      r.fixed_in === null &&
      r.sources.length === 1 &&
      r.sources[0] === "NVD" &&
      !/[<>=–]/.test(r.affected_version) &&
      r.affected_version !== "All versions" &&
      r.affected_version !== "Unspecified"
  );

  if (pointUnfixedNvd.length <= 6) return ranges;

  const others = ranges.filter((r) => !pointUnfixedNvd.includes(r));
  const first = pointUnfixedNvd[0].affected_version;
  const last = pointUnfixedNvd[pointUnfixedNvd.length - 1].affected_version;

  // If explicit ranges already exist from CNA/CISA/OSV, put the clean ranges first and summarize the NVD point list
  const summaryEntry: AffectedVersionRange = {
    affected_version: `${first} … ${last} (${pointUnfixedNvd.length} enumerated CPE versions)`,
    fixed_in: null,
    sources: ["NVD"]
  };

  return others.length > 0 ? [...others, summaryEntry] : [summaryEntry];
}

/**
 * Merge and deduplicate products across sources strictly in order:
 * NVD -> CNA -> CISA -> OSV
 */
export function mergeAffectedProducts(
  nvdItems: RawAffectedItem[],
  cnaItems: RawAffectedItem[],
  cisaItems: RawAffectedItem[],
  osvItems: RawAffectedItem[]
): AffectedProductEntry[] {
  const allItems = [...nvdItems, ...cnaItems, ...cisaItems, ...osvItems];
  const merged: AffectedProductEntry[] = [];

  for (const item of allItems) {
    let target = merged.find((m) => productsMatch(m, item));

    if (!target) {
      target = {
        vendor: item.vendor,
        product: item.product,
        ranges: [],
        sources: [item.source],
        listed_by: item.source
      };
      merged.push(target);
    } else {
      if (!target.sources.includes(item.source)) {
        target.sources = SOURCE_ORDER.filter(
          (s) => target!.sources.includes(s) || s === item.source
        );
      }
      if (item.source === "CNA") {
        if (!isGenericVendor(item.vendor)) target.vendor = item.vendor;
        if (item.product) target.product = item.product;
      } else if (isGenericVendor(target.vendor) && !isGenericVendor(item.vendor)) {
        target.vendor = item.vendor;
      }
    }

    for (const r of item.ranges) {
      const rVerNorm = normVersionCompare(r.affected_version);
      const rFixNorm = normVersionCompare(r.fixed_in);

      const exactMatch = target.ranges.find(
        (er) =>
          normVersionCompare(er.affected_version) === rVerNorm &&
          normVersionCompare(er.fixed_in) === rFixNorm
      );

      if (exactMatch) {
        if (!exactMatch.sources.includes(item.source)) {
          exactMatch.sources = SOURCE_ORDER.filter(
            (s) => exactMatch.sources.includes(s) || s === item.source
          );
        }
        continue;
      }

      const sameVerMatch = target.ranges.find(
        (er) => normVersionCompare(er.affected_version) === rVerNorm
      );
      if (sameVerMatch && (!sameVerMatch.fixed_in || !r.fixed_in)) {
        if (!sameVerMatch.fixed_in && r.fixed_in) {
          sameVerMatch.fixed_in = r.fixed_in;
        }
        if (!sameVerMatch.sources.includes(item.source)) {
          sameVerMatch.sources = SOURCE_ORDER.filter(
            (s) => sameVerMatch.sources.includes(s) || s === item.source
          );
        }
        continue;
      }

      target.ranges.push({
        affected_version: r.affected_version,
        fixed_in: r.fixed_in,
        sources: [item.source]
      });
    }
  }

  for (const m of merged) {
    m.listed_by = formatListedBy(m.sources);
    if (m.ranges.length > 1) {
      const specific = m.ranges.filter(
        (r) => r.affected_version !== "All versions" && r.affected_version !== "Unspecified"
      );
      if (specific.length > 0) {
        m.ranges = specific;
      }
    }
    m.ranges = collapseEnumeratedRanges(m.ranges);
  }

  return merged;
}
