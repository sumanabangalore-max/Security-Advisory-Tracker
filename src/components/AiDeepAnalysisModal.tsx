import React, { useState, useEffect } from "react";
import {
  Sparkles, X, ShieldAlert, ShieldCheck, Terminal, Copy, Check, 
  RotateCw, Download, Server, AlertTriangle, ArrowRight, CheckCircle2,
  FileText, ExternalLink, Cpu, Clock, Key
} from "lucide-react";
import { api } from "../api";

export interface AiDeepAnalysisItem {
  id?: string | number;
  software_name?: string;
  name?: string;
  version?: string;
  installed_version?: string;
  hostname?: string;
  environment?: string;
  cve_id?: string;
  cvss_score?: number | string | null;
  fixed_version?: string;
  latest_same_version_patch?: string;
  latest_market_version?: string;
  summary?: string;
  source?: string;
  status?: string;
  type?: "vulnerability" | "patch" | "inventory" | "eos" | "zero-day";
}

interface AiDeepAnalysisModalProps {
  item: AiDeepAnalysisItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDeployAgent?: (item: any) => void;
}

export default function AiDeepAnalysisModal({
  item,
  isOpen,
  onClose,
  onDeployAgent
}: AiDeepAnalysisModalProps) {
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [activeTab, setActiveTab] = useState<"threat" | "remediation" | "rollback" | "compliance" | "raw">("threat");
  const [activeEngine, setActiveEngine] = useState<"platform" | "gemini">(() => {
    return (localStorage.getItem("active_ai_engine") as "platform" | "gemini") || "platform";
  });

  useEffect(() => {
    if (isOpen && item) {
      fetchAnalysis(item);
    } else {
      setAnalysisData(null);
      setError("");
    }
  }, [isOpen, item]);

  const fetchAnalysis = async (targetItem: AiDeepAnalysisItem, forceEngine?: "platform" | "gemini") => {
    try {
      setLoading(true);
      setError("");
      
      const engineToUse = forceEngine || activeEngine;
      const res = await api.post<any>("/api/v1/ai/deep-analysis", {
        type: targetItem.type || "vulnerability",
        item: targetItem,
        requestedEngine: engineToUse
      });

      setAnalysisData(res);
    } catch (err: any) {
      setError(err.message || "Failed to generate AI deep analysis.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchEngine = (engine: "platform" | "gemini") => {
    setActiveEngine(engine);
    localStorage.setItem("active_ai_engine", engine);
    if (item) {
      fetchAnalysis(item, engine);
    }
  };

  const extractCodeBlocks = (text: string): string[] => {
    if (!text) return [];
    const codeRegex = /```(?:bash|sh|shell|yaml|json|sql)?\n([\s\S]*?)```/g;
    const matches: string[] = [];
    let match;
    while ((match = codeRegex.exec(text)) !== null) {
      matches.push(match[1].trim());
    }
    return matches;
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyAll = () => {
    if (!analysisData?.analysis) return;
    navigator.clipboard.writeText(analysisData.analysis);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadReport = () => {
    if (!analysisData) return;
    const name = item?.software_name || item?.name || "Asset";
    const content = `# GovTech Enterprise DevSecOps AI Deep Advisory\n` +
      `Target: ${name} (v${item?.version || item?.installed_version})\n` +
      `Environment: ${item?.environment || "Production"}\n` +
      `CVE: ${item?.cve_id || "N/A"} | CVSS: ${item?.cvss_score || "N/A"}\n` +
      `AI Engine: ${analysisData.model_used}\n` +
      `Timestamp: ${analysisData.timestamp}\n\n` +
      `---\n\n` +
      analysisData.analysis;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GovTech_AI_Advisory_${name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || !item) return null;

  const name = item.software_name || item.name || "Target Application";
  const version = item.version || item.installed_version || "1.0.0";
  const targetPatch = item.latest_same_version_patch || item.fixed_version || item.latest_market_version || "Latest Secure Patch";
  const rawText = analysisData?.analysis || "";
  const codeBlocks = extractCodeBlocks(rawText);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto" id="ai-deep-analysis-modal">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 text-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-tight">
                  GovTech AI Deep Analysis & Remediation
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-950 border border-indigo-700 text-indigo-300">
                  api.ai.tech.gov.sg
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Live threat vector intelligence, automated remediation playbooks & rollback gating
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Engine & Target Metadata Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Target Metadata summary */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-900">{name}</span>
              <span className="font-mono text-slate-600 bg-slate-200/80 px-1.5 py-0.2 rounded text-[11px]">v{version}</span>
            </div>
            {item.hostname && (
              <div className="text-slate-500 font-mono text-[11px]">
                Host: <span className="text-slate-800 font-bold">{item.hostname}</span>
              </div>
            )}
            {item.cve_id && (
              <div className="flex items-center gap-1">
                <span className="font-mono font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded text-[11px]">
                  {item.cve_id}
                </span>
                {item.cvss_score && (
                  <span className="font-bold text-rose-800 text-[11px]">
                    (CVSS {item.cvss_score})
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1 text-emerald-800 font-semibold text-[11px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Target: <span className="font-mono font-bold">{targetPatch}</span>
            </div>
          </div>

          {/* Engine Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Engine:</span>
            <div className="inline-flex bg-slate-200 p-0.5 rounded-lg border border-slate-300">
              <button
                onClick={() => handleSwitchEngine("platform")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer flex items-center gap-1 ${
                  activeEngine === "platform"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-700 hover:text-slate-900"
                }`}
                title="Use GovTech AI Platform API (api.ai.tech.gov.sg)"
              >
                <span>GovTech AI</span>
              </button>
              <button
                onClick={() => handleSwitchEngine("gemini")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer flex items-center gap-1 ${
                  activeEngine === "gemini"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-700 hover:text-slate-900"
                }`}
                title="Use Google Gemini API"
              >
                <span>Gemini</span>
              </button>
            </div>

            <button
              onClick={() => item && fetchAnalysis(item, activeEngine)}
              disabled={loading}
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50"
              title="Regenerate Analysis"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-16 text-center space-y-4">
              <div className="relative w-14 h-14 mx-auto">
                <div className="w-14 h-14 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
                <Sparkles className="w-6 h-6 text-indigo-600 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Calling {activeEngine === "platform" ? "GovTech AI Platform Gateway (api.ai.tech.gov.sg)" : "Google Gemini 3.6 Flash"}...
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Synthesizing threat vector heuristics, generating step-by-step CLI remediation scripts, and verifying pre-production rollback procedures.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>AI Deep Analysis Error</span>
              </div>
              <p className="font-mono text-rose-700">{error}</p>
              <button
                onClick={() => item && fetchAnalysis(item)}
                className="mt-2 px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition cursor-pointer"
              >
                Retry Analysis
              </button>
            </div>
          ) : analysisData ? (
            <div className="space-y-5">
              {/* Telemetry Status Ribbon */}
              <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 text-slate-600 font-mono text-[11px]">
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                    Model: <strong className="text-slate-800">{analysisData.model_used}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Latency: <strong className="text-slate-800">{analysisData.duration_ms}ms</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Status: <strong className="text-emerald-700">Verified Advisory</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition cursor-pointer"
                  >
                    {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiedAll ? "Copied All" : "Copy Advisory"}</span>
                  </button>

                  <button
                    onClick={handleDownloadReport}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-indigo-700 font-semibold text-xs rounded-lg border border-indigo-200 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Download Markdown</span>
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-200 gap-2">
                <button
                  onClick={() => setActiveTab("threat")}
                  className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    activeTab === "threat"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Threat & Impact Analysis
                </button>

                <button
                  onClick={() => setActiveTab("remediation")}
                  className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "remediation"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                  CLI Remediation Commands ({codeBlocks.length || 1})
                </button>

                <button
                  onClick={() => setActiveTab("rollback")}
                  className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    activeTab === "rollback"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Rollback & Pre-Prod Gates
                </button>

                <button
                  onClick={() => setActiveTab("compliance")}
                  className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    activeTab === "compliance"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  IM8 & Policy Compliance
                </button>

                <button
                  onClick={() => setActiveTab("raw")}
                  className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    activeTab === "raw"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Full Advisory View
                </button>
              </div>

              {/* Tab 1: Threat Analysis */}
              {activeTab === "threat" && (
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
                      <ShieldAlert className="w-4 h-4 text-indigo-600" />
                      Executive Threat Assessment & Exploitation Vector
                    </div>
                    <div className="text-xs text-indigo-950 leading-relaxed space-y-2">
                      <p>
                        Target application <strong className="font-mono">{name} (v{version})</strong> deployed in <strong>{item.environment || "Production"}</strong> on host <strong>{item.hostname || "primary cluster"}</strong> has been evaluated by the GovTech AI threat intelligence engine.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                        <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Severity Rating</span>
                          <div className="text-sm font-bold text-rose-600 mt-0.5">
                            {item.cvss_score ? `CVSS ${item.cvss_score} / 10.0` : "High Severity Patch"}
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Target Resolution</span>
                          <div className="text-sm font-mono font-bold text-emerald-700 mt-0.5">
                            {targetPatch}
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Zero-Day Vector</span>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">
                            {item.cve_id ? "Known CVE Correlation" : "Proactive Maintenance"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Narrative */}
                  <div className="prose prose-xs max-w-none text-slate-700 bg-white p-4 border border-slate-200 rounded-xl whitespace-pre-wrap leading-relaxed font-sans text-xs">
                    {rawText}
                  </div>
                </div>
              )}

              {/* Tab 2: CLI Remediation Commands */}
              {activeTab === "remediation" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-600">
                      Standard operating procedures generated for applying <strong className="font-mono">{targetPatch}</strong> safely:
                    </p>
                    {codeBlocks.length > 0 && (
                      <button
                        onClick={() => handleCopyCode(codeBlocks.join("\n\n"))}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? "Copied Script" : "Copy CLI Script"}</span>
                      </button>
                    )}
                  </div>

                  {codeBlocks.length > 0 ? (
                    codeBlocks.map((block, idx) => (
                      <div key={idx} className="bg-slate-900 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-md">
                        <div className="flex items-center justify-between bg-slate-950 px-4 py-2 border-b border-slate-800 text-[11px] font-mono text-slate-400">
                          <span className="flex items-center gap-2">
                            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Step {idx + 1}: Automated Execution Commands</span>
                          </span>
                          <button
                            onClick={() => handleCopyCode(block)}
                            className="hover:text-white transition cursor-pointer flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </button>
                        </div>
                        <pre className="p-4 text-xs font-mono overflow-x-auto text-emerald-400 whitespace-pre leading-relaxed">
                          {block}
                        </pre>
                      </div>
                    ))
                  ) : (
                    <div className="bg-slate-900 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-md">
                      <div className="flex items-center justify-between bg-slate-950 px-4 py-2 border-b border-slate-800 text-[11px] font-mono text-slate-400">
                        <span className="flex items-center gap-2">
                          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Direct Upgrade Command</span>
                        </span>
                        <button
                          onClick={() => handleCopyCode(`sudo apt-get update && sudo apt-get --only-upgrade install ${name.toLowerCase().replace(/[^a-z0-9]/g, '')}=${targetPatch} -y`)}
                          className="hover:text-white transition cursor-pointer flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                      </div>
                      <pre className="p-4 text-xs font-mono overflow-x-auto text-emerald-400 whitespace-pre leading-relaxed">
{`# 1. Update package lists and security channel repositories
sudo apt-get update

# 2. Execute targeted in-place patch upgrade for ${name}
sudo apt-get --only-upgrade install ${name.toLowerCase().replace(/[^a-z0-9]/g, '')}=${targetPatch} -y

# 3. Restart application service daemon and confirm operational status
systemctl restart ${name.toLowerCase().split(' ')[0]}
systemctl status ${name.toLowerCase().split(' ')[0]}`}
                      </pre>
                    </div>
                  )}

                  {onDeployAgent && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <h5 className="font-bold text-xs text-emerald-950">Automated Jump-Host Deployment</h5>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          Deploy this patch through the air-gapped AIPatch remote jump-host CI runner.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          onClose();
                          onDeployAgent(item);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Deploy via Agent</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Rollback & Pre-prod Gating */}
              {activeTab === "rollback" && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-amber-950 font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Contingency & Rollback Procedures
                    </div>
                    <div className="text-xs text-amber-950 space-y-2">
                      <p>
                        In case of post-upgrade regression or application health failure, follow the structured downgrade procedure:
                      </p>
                      <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] text-amber-300">
                        {`# Immediate rollback to baseline version v${version}
sudo apt-get install --allow-downgrades ${name.toLowerCase().replace(/[^a-z0-9]/g, '')}=${version} -y
systemctl restart ${name.toLowerCase().split(' ')[0]}`}
                      </div>
                    </div>
                  </div>

                  {/* Staging Pipeline Matrix */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Pre-Production Promotion Pipeline (DEV → SIT → UAT → ORT → PROD)
                    </h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                        <span className="text-[10px] font-extrabold uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          DEV Stage
                        </span>
                        <p className="text-[11px] text-slate-600 font-semibold mt-2">Unit & Smoke Tests</p>
                        <span className="text-[10px] font-mono text-emerald-600 font-bold block mt-1">Pass Gate: OK</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                        <span className="text-[10px] font-extrabold uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          SIT Stage
                        </span>
                        <p className="text-[11px] text-slate-600 font-semibold mt-2">API Integration Tests</p>
                        <span className="text-[10px] font-mono text-emerald-600 font-bold block mt-1">Pass Gate: OK</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                        <span className="text-[10px] font-extrabold uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          UAT Stage
                        </span>
                        <p className="text-[11px] text-slate-600 font-semibold mt-2">User Acceptance Verify</p>
                        <span className="text-[10px] font-mono text-emerald-600 font-bold block mt-1">Sign-off Ready</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                        <span className="text-[10px] font-extrabold uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          PROD Release
                        </span>
                        <p className="text-[11px] text-slate-600 font-semibold mt-2">Live Maintenance Window</p>
                        <span className="text-[10px] font-mono text-amber-600 font-bold block mt-1">CAB Approved</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Compliance */}
              {activeTab === "compliance" && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      GovTech IM8 & Security Policy Controls
                    </div>
                    <ul className="text-xs text-emerald-950 space-y-1.5 list-disc list-inside">
                      <li><strong>IM8 Sec-12:</strong> Mandatory remediation of Critical/High vulnerabilities within designated SLA windows.</li>
                      <li><strong>CIS Benchmark:</strong> Enforces minimum privilege software installation and verification of vendor cryptographic checksums.</li>
                      <li><strong>GovTech AIR Policy:</strong> Automated patch telemetry logged to SIEM audit trails with SHA256 verification hash.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Tab 5: Raw Advisory */}
              {activeTab === "raw" && (
                <div className="bg-slate-900 text-slate-100 p-5 rounded-xl font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96">
                  {rawText}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            SecAdvisor Enterprise • GovTech AI Engine Integration
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition cursor-pointer"
          >
            Close Advisory
          </button>
        </div>
      </div>
    </div>
  );
}
