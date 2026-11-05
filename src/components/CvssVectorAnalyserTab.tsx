import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Search,
  Globe,
  Lock,
  ArrowRight,
  TrendingDown,
  Info,
  ExternalLink,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  ChevronRight,
  Sparkles,
  BookOpen,
  Filter
} from "lucide-react";
import {
  Cvss31Metrics,
  Cvss40Metrics,
  parseCvss31Vector,
  parseCvss40Vector,
  synthesizeCvss40From31,
  rescoreCvss31ForExposure,
  rescoreCvss40ForExposure
} from "../utils/cvssEngine";

interface ResolvedCveResponse {
  success: boolean;
  cve_id: string;
  title?: string;
  description?: string;
  vuln_status?: string;
  is_nvd_assessed?: boolean;
  resolution_source?: string;
  published_date?: string;
  cvss_v31?: {
    version: "3.1";
    vectorString: string;
    baseScore: number;
    baseSeverity: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    sourceType: "NVD Primary" | "CNA Secondary" | "CVE.org (Primary CNA)" | "Synthesized";
    sourceName?: string;
  } | null;
  cvss_v40?: {
    version: "4.0";
    vectorString: string;
    baseScore: number;
    baseSeverity: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    sourceType: "NVD Primary" | "CNA Secondary" | "CVE.org (Primary CNA)" | "Synthesized";
    sourceName?: string;
  } | null;
}

export default function CvssVectorAnalyserTab() {
  const [cveInput, setCveInput] = useState<string>("CVE-2024-3094");
  const [exposure, setExposure] = useState<"Internet" | "Intranet">("Intranet");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Resolved CVE Details
  const [cveDetails, setCveDetails] = useState<ResolvedCveResponse | null>(null);

  // Calculated CVSS 3.1 & 4.0 States
  const [baseCvss31, setBaseCvss31] = useState<Cvss31Metrics | null>(null);
  const [rescoredCvss31, setRescoredCvss31] = useState<Cvss31Metrics | null>(null);

  const [baseCvss40, setBaseCvss40] = useState<Cvss40Metrics | null>(null);
  const [rescoredCvss40, setRescoredCvss40] = useState<Cvss40Metrics | null>(null);

  // Quick preset CVEs for fast testing
  const presetCves = [
    { id: "CVE-2024-3094", label: "XZ Utils (10.0 Critical)", desc: "Remote Backdoor" },
    { id: "CVE-2024-38063", label: "Windows TCP/IP (9.8 Critical)", desc: "Zero-Click RCE" },
    { id: "CVE-2024-21626", label: "runc Breakout (8.6 High)", desc: "Container Escape" },
    { id: "CVE-2024-3400", label: "PAN-OS GlobalProtect (10.0)", desc: "Command Injection" },
    { id: "CVE-2024-21413", label: "Outlook MonikerLink (9.8)", desc: "NTLM Credential Leak" }
  ];

  // Fetch CVE live vectors on load or on user submit
  const fetchCveVectors = async (targetId: string) => {
    let clean = targetId.trim().toUpperCase();
    if (!clean) return;
    if (/^\d{4}-\d+$/.test(clean)) clean = `CVE-${clean}`;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/cvss/resolve?cve_id=${encodeURIComponent(clean)}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch CVE data: HTTP ${res.status}`);
      }
      const data: ResolvedCveResponse = await res.json();
      setCveDetails(data);

      // Process CVSS 3.1
      if (data.cvss_v31 && data.cvss_v31.vectorString) {
        const parsed31 = parseCvss31Vector(data.cvss_v31.vectorString);
        const full31: Cvss31Metrics = {
          ...parsed31,
          sourceType: data.cvss_v31.sourceType,
          sourceName: data.cvss_v31.sourceName
        };
        setBaseCvss31(full31);

        // Process CVSS 4.0: use live 4.0 if present, else synthesize from 3.1
        if (data.cvss_v40 && data.cvss_v40.vectorString) {
          const parsed40 = parseCvss40Vector(data.cvss_v40.vectorString);
          const full40: Cvss40Metrics = {
            ...parsed40,
            sourceType: data.cvss_v40.sourceType,
            sourceName: data.cvss_v40.sourceName
          };
          setBaseCvss40(full40);
        } else {
          const synth40 = synthesizeCvss40From31(full31);
          setBaseCvss40(synth40);
        }
      } else {
        // Fallback default
        const parsed31 = parseCvss31Vector("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H");
        const full31: Cvss31Metrics = {
          ...parsed31,
          sourceType: "CNA Secondary",
          sourceName: "Standard Baseline"
        };
        setBaseCvss31(full31);
        setBaseCvss40(synthesizeCvss40From31(full31));
      }
    } catch (err: any) {
      setError(err.message || "Failed to resolve CVE from NVD and CVE.org");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCveVectors(cveInput);
  }, []);

  // Whenever base vectors or exposure changes, recompute the rescored metrics
  useEffect(() => {
    if (baseCvss31) {
      const rescored31 = rescoreCvss31ForExposure(baseCvss31, exposure);
      setRescoredCvss31(rescored31);
    }
    if (baseCvss40) {
      const rescored40 = rescoreCvss40ForExposure(baseCvss40, exposure);
      setRescoredCvss40(rescored40);
    }
  }, [baseCvss31, baseCvss40, exposure]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCveVectors(cveInput);
  };

  const getSeverityBadgeColor = (severity?: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-rose-500/10 text-rose-600 border-rose-500/30";
      case "HIGH":
        return "bg-amber-500/10 text-amber-600 border-amber-500/30";
      case "MEDIUM":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "LOW":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
      default:
        return "bg-slate-500/10 text-slate-600 border-slate-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  CVSS Vector Analyser
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                    CVSS 3.1 & 4.0
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rescore official vulnerability vectors based on host network exposure using FIRST Environmental Metrics (<code className="text-indigo-600 font-semibold">MAV:A</code> Adjacent Network).
                </p>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400">Presets:</span>
            {presetCves.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setCveInput(p.id);
                  fetchCveVectors(p.id);
                }}
                className={`text-xs px-2.5 py-1 rounded-lg border font-mono font-medium transition-all cursor-pointer ${
                  cveInput.toUpperCase() === p.id
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
                title={p.desc}
              >
                {p.id}
              </button>
            ))}
          </div>
        </div>

        {/* Form Controls: CVE Input + Exposure Dropdown */}
        <form onSubmit={handleSearchSubmit} className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* CVE Input Field */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-indigo-600" />
              Target CVE ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={cveInput}
                onChange={(e) => setCveInput(e.target.value)}
                placeholder="e.g. CVE-2024-3094, CVE-2024-38063"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Analyze
              </button>
            </div>
          </div>

          {/* Server Exposure Dropdown */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-indigo-600" />
              Server Exposure Setting
            </label>
            <div className="relative">
              <select
                value={exposure}
                onChange={(e) => setExposure(e.target.value as "Internet" | "Intranet")}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer appearance-none"
              >
                <option value="Intranet">🏢 Intranet (Non-Internet Facing / Internal)</option>
                <option value="Internet">🌐 Internet (Public Facing / Edge Host)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                {exposure === "Internet" ? (
                  <Globe className="h-4 w-4 text-rose-500" />
                ) : (
                  <Lock className="h-4 w-4 text-emerald-600" />
                )}
              </div>
            </div>
          </div>

          {/* Exposure Summary Action */}
          <div className="md:col-span-2">
            <div className={`p-2.5 rounded-xl border text-center transition-all ${
              exposure === "Intranet"
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                : "bg-rose-50/70 border-rose-200 text-rose-800"
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider block">
                {exposure === "Intranet" ? "Score Reduced" : "Score Preserved"}
              </span>
              <span className="text-xs font-extrabold flex items-center justify-center gap-1 mt-0.5">
                {exposure === "Intranet" ? (
                  <>
                    <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
                    MAV: Adjacent (A)
                  </>
                ) : (
                  <>
                    <Globe className="h-3.5 w-3.5 text-rose-500" />
                    AV: Network (N)
                  </>
                )}
              </span>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* CVE Metadata Card */}
      {cveDetails && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-black text-slate-900 font-mono tracking-tight">
                  {cveDetails.cve_id}
                </span>
                {cveDetails.is_nvd_assessed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    NVD Analyzed (Primary)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                    {cveDetails.vuln_status || "Awaiting NVD Analysis"} (CNA Score Active)
                  </span>
                )}
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  Source: {cveDetails.resolution_source}
                </span>
              </div>

              {cveDetails.title && (
                <h3 className="text-sm font-bold text-slate-800">
                  {cveDetails.title}
                </h3>
              )}

              <p className="text-xs text-slate-600 leading-relaxed max-w-4xl line-clamp-2">
                {cveDetails.description || "No official description published."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`https://nvd.nist.gov/vuln/detail/${cveDetails.cve_id}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1.5 transition-colors"
              >
                NVD Record <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={`https://www.cve.org/CVERecord?id=${cveDetails.cve_id}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors"
              >
                CVE.org <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Side-by-Side: CVSS 3.1 vs CVSS 4.0 Rescore Panes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ======================================================== */}
        {/* CVSS v3.1 Card */}
        {/* ======================================================== */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs border border-blue-100">
                  3.1
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">CVSS v3.1 Assessment</h2>
                  <span className="text-[10px] text-slate-400 font-medium">Standard Vulnerability Scoring</span>
                </div>
              </div>

              {baseCvss31 && (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                  {baseCvss31.sourceType}
                </span>
              )}
            </div>

            {/* Score Comparison Display */}
            {baseCvss31 && rescoredCvss31 && (
              <div className="p-5 bg-slate-50/50 border-b border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                  {/* Original Score */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Base Live Score
                    </span>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-black text-slate-900">
                        {baseCvss31.baseScore.toFixed(1)}
                      </span>
                      <span className="text-xs font-bold text-slate-400">/ 10</span>
                    </div>
                    <span className={`inline-block mt-2 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${getSeverityBadgeColor(baseCvss31.baseSeverity)}`}>
                      {baseCvss31.baseSeverity}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Attack Vector: <strong className="text-slate-600">AV:{baseCvss31.av}</strong>
                    </span>
                  </div>

                  {/* Rescored Score for Exposure */}
                  <div className={`p-4 rounded-xl border text-center transition-all ${
                    exposure === "Intranet"
                      ? "bg-emerald-50/80 border-emerald-300 shadow-xs"
                      : "bg-white border-slate-200"
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1 flex items-center justify-center gap-1">
                      {exposure === "Intranet" ? (
                        <>
                          <TrendingDown className="h-3 w-3 text-emerald-600" />
                          Intranet Rescored
                        </>
                      ) : (
                        "Internet Exposed"
                      )}
                    </span>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className={`text-3xl font-black ${
                        exposure === "Intranet" && (rescoredCvss31.adjustedScore || 0) < baseCvss31.baseScore
                          ? "text-emerald-700"
                          : "text-slate-900"
                      }`}>
                        {(rescoredCvss31.adjustedScore || rescoredCvss31.baseScore).toFixed(1)}
                      </span>
                      <span className="text-xs font-bold text-slate-400">/ 10</span>
                    </div>
                    <span className={`inline-block mt-2 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${getSeverityBadgeColor(rescoredCvss31.adjustedSeverity)}`}>
                      {rescoredCvss31.adjustedSeverity}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      {exposure === "Intranet" ? (
                        <span className="text-emerald-700 font-bold">
                          MAV: Adjacent (A)
                        </span>
                      ) : (
                        <span>MAV: Network (N)</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Score Difference Pill */}
                {exposure === "Intranet" && (rescoredCvss31.adjustedScore || 0) < baseCvss31.baseScore && (
                  <div className="mt-3 p-2 bg-emerald-100/70 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900 font-medium">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Exposure Discount Applied:
                    </span>
                    <span className="font-extrabold font-mono text-emerald-700">
                      -{(baseCvss31.baseScore - (rescoredCvss31.adjustedScore || 0)).toFixed(1)} pts
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Vector Breakdown */}
            {rescoredCvss31 && (
              <div className="p-5 space-y-4">
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-1">
                    Effective Vector String:
                  </span>
                  <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-xs break-all shadow-inner">
                    {rescoredCvss31.adjustedVectorString || rescoredCvss31.vectorString}
                  </div>
                </div>

                {/* Metrics Matrix Table */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 block">AV</span>
                    <span className="font-extrabold text-slate-800 font-mono">
                      {rescoredCvss31.av}
                    </span>
                  </div>
                  <div className={`p-2 rounded-lg border font-mono ${
                    exposure === "Intranet" ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}>
                    <span className="text-[10px] font-bold text-slate-400 block">MAV</span>
                    <span className="font-extrabold">
                      {rescoredCvss31.mav || "N"}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono">
                    <span className="text-[10px] font-bold text-slate-400 block">AC</span>
                    <span className="font-extrabold text-slate-800">
                      {rescoredCvss31.ac}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono">
                    <span className="text-[10px] font-bold text-slate-400 block">PR</span>
                    <span className="font-extrabold text-slate-800">
                      {rescoredCvss31.pr}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono">
                    <span className="text-[10px] font-bold text-slate-400 block">UI</span>
                    <span className="font-extrabold text-slate-800">
                      {rescoredCvss31.ui}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono">
                    <span className="text-[10px] font-bold text-slate-400 block">Scope</span>
                    <span className="font-extrabold text-slate-800">
                      {rescoredCvss31.s}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono">
                    <span className="text-[10px] font-bold text-slate-400 block">C / I / A</span>
                    <span className="font-extrabold text-slate-800">
                      {rescoredCvss31.c}/{rescoredCvss31.i}/{rescoredCvss31.a}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono">
                    <span className="text-[10px] font-bold text-slate-400 block">Formula</span>
                    <span className="font-extrabold text-indigo-600">
                      FIRST 3.1
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-100/70 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Formula standard: <strong>NIST / FIRST CVSS v3.1</strong></span>
            <span>Origin: {baseCvss31?.sourceName || "NVD"}</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CVSS v4.0 Card */}
        {/* ======================================================== */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs border border-indigo-100">
                  4.0
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">CVSS v4.0 Assessment</h2>
                  <span className="text-[10px] text-slate-400 font-medium">Next-Generation MacroVector Standard</span>
                </div>
              </div>

              {baseCvss40 && (
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                  baseCvss40.sourceType === "Synthesized"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}>
                  {baseCvss40.sourceType === "Synthesized" ? "✨ Synthesized from v3.1" : baseCvss40.sourceType}
                </span>
              )}
            </div>

            {/* Score Comparison Display */}
            {baseCvss40 && rescoredCvss40 && (
              <div className="p-5 bg-slate-50/50 border-b border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                  {/* Original Score */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Base Live Score
                    </span>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-black text-slate-900">
                        {baseCvss40.baseScore.toFixed(1)}
                      </span>
                      <span className="text-xs font-bold text-slate-400">/ 10</span>
                    </div>
                    <span className={`inline-block mt-2 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${getSeverityBadgeColor(baseCvss40.baseSeverity)}`}>
                      {baseCvss40.baseSeverity}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Attack Vector: <strong className="text-slate-600">AV:{baseCvss40.av}</strong>
                    </span>
                  </div>

                  {/* Rescored Score for Exposure */}
                  <div className={`p-4 rounded-xl border text-center transition-all ${
                    exposure === "Intranet"
                      ? "bg-emerald-50/80 border-emerald-300 shadow-xs"
                      : "bg-white border-slate-200"
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1 flex items-center justify-center gap-1">
                      {exposure === "Intranet" ? (
                        <>
                          <TrendingDown className="h-3 w-3 text-emerald-600" />
                          Intranet Rescored
                        </>
                      ) : (
                        "Internet Exposed"
                      )}
                    </span>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className={`text-3xl font-black ${
                        exposure === "Intranet" && (rescoredCvss40.adjustedScore || 0) < baseCvss40.baseScore
                          ? "text-emerald-700"
                          : "text-slate-900"
                      }`}>
                        {(rescoredCvss40.adjustedScore || rescoredCvss40.baseScore).toFixed(1)}
                      </span>
                      <span className="text-xs font-bold text-slate-400">/ 10</span>
                    </div>
                    <span className={`inline-block mt-2 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${getSeverityBadgeColor(rescoredCvss40.adjustedSeverity)}`}>
                      {rescoredCvss40.adjustedSeverity}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      {exposure === "Intranet" ? (
                        <span className="text-emerald-700 font-bold">
                          MAV: Adjacent (A)
                        </span>
                      ) : (
                        <span>MAV: Network (N)</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Score Difference Pill */}
                {exposure === "Intranet" && (rescoredCvss40.adjustedScore || 0) < baseCvss40.baseScore && (
                  <div className="mt-3 p-2 bg-emerald-100/70 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900 font-medium">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Exposure Discount Applied:
                    </span>
                    <span className="font-extrabold font-mono text-emerald-700">
                      -{(baseCvss40.baseScore - (rescoredCvss40.adjustedScore || 0)).toFixed(1)} pts
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Vector Breakdown */}
            {rescoredCvss40 && (
              <div className="p-5 space-y-4">
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-1">
                    Effective Vector String:
                  </span>
                  <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-xs break-all shadow-inner">
                    {rescoredCvss40.adjustedVectorString || rescoredCvss40.vectorString}
                  </div>
                </div>

                {/* Metrics Matrix Table */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono">
                    <span className="text-[10px] font-bold text-slate-400 block">AV</span>
                    <span className="font-extrabold text-slate-800">
                      {rescoredCvss40.av}
                    </span>
                  </div>
                  <div className={`p-2 rounded-lg border font-mono ${
                    exposure === "Intranet" ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}>
                    <span className="text-[10px] font-bold text-slate-400 block">MAV</span>
                    <span className="font-extrabold">
                      {rescoredCvss40.mav || "N"}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono">
                    <span className="text-[10px] font-bold text-slate-400 block">AC / AT</span>
                    <span className="font-extrabold text-slate-800">
                      {rescoredCvss40.ac}/{rescoredCvss40.at}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono">
                    <span className="text-[10px] font-bold text-slate-400 block">PR / UI</span>
                    <span className="font-extrabold text-slate-800">
                      {rescoredCvss40.pr}/{rescoredCvss40.ui}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 block">Vuln System (VC/VI/VA)</span>
                    <span className="font-extrabold text-slate-800">
                      {rescoredCvss40.vc}/{rescoredCvss40.vi}/{rescoredCvss40.va}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 block">Subseq System (SC/SI/SA)</span>
                    <span className="font-extrabold text-slate-800">
                      {rescoredCvss40.sc}/{rescoredCvss40.si}/{rescoredCvss40.sa}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-100/70 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Formula standard: <strong>FIRST CVSS v4.0 MacroVectors</strong></span>
            <span>Origin: {baseCvss40?.sourceName || "NVD/CVE.org"}</span>
          </div>
        </div>
      </div>

      {/* Explanatory Guide Box */}
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 text-xs text-indigo-900 space-y-2">
        <h4 className="font-bold flex items-center gap-1.5 text-indigo-950">
          <BookOpen className="h-4 w-4 text-indigo-600" />
          How Exposure Rescoring Works (FIRST CVSS Standard)
        </h4>
        <p className="leading-relaxed text-indigo-800">
          The <strong>Common Vulnerability Scoring System (CVSS)</strong> includes an <em>Environmental Metric Group</em> designed to customize base scores to an organization's actual infrastructure. When a server is designated as <strong>Intranet (Non-Internet Facing)</strong>, an external attacker cannot reach the target over the public Internet; the vulnerability can only be exploited by someone already within the local broadcast domain or adjacent network segment. Under FIRST specifications, the <strong>Modified Attack Vector (MAV)</strong> is rescored from <code>Network (AV:N)</code> to <code>Adjacent (MAV:A)</code>, reducing the exploitability multiplier and resulting in a reduced environmental risk score.
        </p>
      </div>
    </div>
  );
}
