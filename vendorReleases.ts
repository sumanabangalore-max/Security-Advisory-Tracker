import fs from "fs";
import path from "path";

export interface VendorReleaseItem {
  tag: string;
  version: string;
  published_at: string;
  url: string;
}

export interface VendorSoftwareCatalogEntry {
  software_key: string;
  aliases: string[];
  canonical_name: string;
  source_type: "github" | "google_chrome" | "static";
  repo?: string;
  source_url: string;
  latest_market_version: string;
  market_release_date: string;
  releases: VendorReleaseItem[];
  branch_patches: Record<string, { version: string; release_date: string; eol?: boolean }>;
  last_checked?: string;
}

export function parseVersionTokens(v: string): number[] {
  let cleaned = (v || "").trim();
  if (cleaned.startsWith("v") || cleaned.startsWith("V")) cleaned = cleaned.substring(1);
  if (cleaned.startsWith("release-")) cleaned = cleaned.replace("release-", "");
  if (cleaned.startsWith("openssl-")) cleaned = cleaned.replace("openssl-", "");
  if (cleaned.includes("(")) cleaned = cleaned.split("(")[0].trim();
  return cleaned.split(/[\.\-\_\+]/).map(s => {
    const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
    return isNaN(n) ? 0 : n;
  });
}

export function compareSemver(v1: string, v2: string): number {
  if (!v1 && !v2) return 0;
  if (!v1) return -1;
  if (!v2) return 1;
  const p1 = parseVersionTokens(v1);
  const p2 = parseVersionTokens(v2);
  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}

export function formatWithOriginalPrefix(targetVer: string, originalVer: string): string {
  const hasV = (originalVer || "").trim().startsWith("v") || (originalVer || "").trim().startsWith("V");
  const clean = (targetVer || "").replace(/^[vV]/, "");
  return hasV ? `v${clean}` : clean;
}

// Baseline known vendor definitions
const BASELINE_VENDOR_CATALOG: Record<string, VendorSoftwareCatalogEntry> = {
  "angular.js": {
    software_key: "angular.js",
    aliases: ["angular.js", "angularjs", "angular", "angular-core", "angular.js framework", "angular framework"],
    canonical_name: "Angular.js (AngularJS)",
    source_type: "github",
    repo: "angular/angular.js",
    source_url: "https://github.com/angular/angular.js/releases",
    latest_market_version: "1.8.3",
    market_release_date: "2024-04-10",
    releases: [
      { tag: "v1.8.3", version: "1.8.3", published_at: "2024-04-10", url: "https://github.com/angular/angular.js/releases/tag/v1.8.3" },
      { tag: "v1.8.2", version: "1.8.2", published_at: "2020-10-22", url: "https://github.com/angular/angular.js/releases/tag/v1.8.2" },
      { tag: "v1.8.0", version: "1.8.0", published_at: "2020-05-20", url: "https://github.com/angular/angular.js/releases/tag/v1.8.0" },
      { tag: "v1.7.9", version: "1.7.9", published_at: "2019-11-19", url: "https://github.com/angular/angular.js/releases/tag/v1.7.9" }
    ],
    branch_patches: {
      "1.8": { version: "1.8.3", release_date: "2024-04-10", eol: false },
      "1.7": { version: "1.7.9", release_date: "2019-11-19", eol: true },
      "1.6": { version: "1.6.10", release_date: "2018-05-18", eol: true },
      "1.5": { version: "1.5.11", release_date: "2017-01-13", eol: true }
    }
  },
  "istio": {
    software_key: "istio",
    aliases: ["istio", "istio-proxy", "istiod", "istio service mesh"],
    canonical_name: "Istio Service Mesh",
    source_type: "github",
    repo: "istio/istio",
    source_url: "https://istio.io/latest/news/releases/",
    latest_market_version: "1.31.0",
    market_release_date: "2026-08-31",
    releases: [
      { tag: "1.31.0", version: "1.31.0", published_at: "2026-08-31", url: "https://github.com/istio/istio/releases/tag/1.31.0" },
      { tag: "1.30.4", version: "1.30.4", published_at: "2026-08-27", url: "https://github.com/istio/istio/releases/tag/1.30.4" },
      { tag: "1.29.7", version: "1.29.7", published_at: "2026-08-27", url: "https://github.com/istio/istio/releases/tag/1.29.7" }
    ],
    branch_patches: {
      "1.31": { version: "1.31.0", release_date: "2026-08-31", eol: false },
      "1.30": { version: "1.30.4", release_date: "2026-08-27", eol: false },
      "1.29": { version: "1.29.7", release_date: "2026-08-27", eol: false },
      "1.28": { version: "1.28.9", release_date: "2026-07-16", eol: true },
      "1.27": { version: "1.27.9", release_date: "2026-03-30", eol: true },
      "1.26": { version: "1.26.8", release_date: "2025-12-18", eol: true },
      "1.25": { version: "1.25.6", release_date: "2025-09-22", eol: true },
      "1.24": { version: "1.24.6", release_date: "2025-06-19", eol: true },
      "1.23": { version: "1.23.6", release_date: "2025-04-07", eol: true },
      "1.22": { version: "1.22.6", release_date: "2024-12-18", eol: true }
    }
  },
  "cert-manager": {
    software_key: "cert-manager",
    aliases: ["cert-manager", "certmanager", "jetstack/cert-manager"],
    canonical_name: "Cert-Manager",
    source_type: "github",
    repo: "cert-manager/cert-manager",
    source_url: "https://cert-manager.io/docs/releases/",
    latest_market_version: "1.21.2",
    market_release_date: "2026-09-11",
    releases: [
      { tag: "v1.21.2", version: "1.21.2", published_at: "2026-09-11", url: "https://github.com/cert-manager/cert-manager/releases/tag/v1.21.2" },
      { tag: "v1.21.1", version: "1.21.1", published_at: "2026-07-29", url: "https://github.com/cert-manager/cert-manager/releases/tag/v1.21.1" },
      { tag: "v1.21.0", version: "1.21.0", published_at: "2026-07-08", url: "https://github.com/cert-manager/cert-manager/releases/tag/v1.21.0" },
      { tag: "v1.20.3", version: "1.20.3", published_at: "2026-08-15", url: "https://github.com/cert-manager/cert-manager/releases/tag/v1.20.3" },
      { tag: "v1.19.6", version: "1.19.6", published_at: "2026-07-10", url: "https://github.com/cert-manager/cert-manager/releases/tag/v1.19.6" }
    ],
    branch_patches: {
      "1.21": { version: "1.21.2", release_date: "2026-09-11", eol: false },
      "1.20": { version: "1.20.3", release_date: "2026-08-15", eol: false },
      "1.19": { version: "1.19.6", release_date: "2026-07-10", eol: false },
      "1.18": { version: "1.18.2", release_date: "2026-05-14", eol: false },
      "1.17": { version: "1.17.1", release_date: "2026-03-12", eol: true },
      "1.16": { version: "1.16.4", release_date: "2025-01-20", eol: true },
      "1.15": { version: "1.15.4", release_date: "2024-10-15", eol: true },
      "1.14": { version: "1.14.7", release_date: "2024-06-10", eol: true }
    }
  },
  "flux": {
    software_key: "flux",
    aliases: ["flux", "fluxcd", "flux2", "source-controller", "kustomize-controller", "helm-controller", "notification-controller"],
    canonical_name: "Flux GitOps CD",
    source_type: "github",
    repo: "fluxcd/flux2",
    source_url: "https://github.com/fluxcd/flux2/releases",
    latest_market_version: "2.9.5",
    market_release_date: "2026-08-31",
    releases: [
      { tag: "v2.9.5", version: "2.9.5", published_at: "2026-08-31", url: "https://github.com/fluxcd/flux2/releases/tag/v2.9.5" },
      { tag: "v2.9.4", version: "2.9.4", published_at: "2026-08-07", url: "https://github.com/fluxcd/flux2/releases/tag/v2.9.4" },
      { tag: "v2.9.3", version: "2.9.3", published_at: "2026-07-23", url: "https://github.com/fluxcd/flux2/releases/tag/v2.9.3" }
    ],
    branch_patches: {
      "2.9": { version: "2.9.5", release_date: "2026-08-31", eol: false },
      "2.8": { version: "2.8.2", release_date: "2026-06-15", eol: false },
      "2.7": { version: "2.7.1", release_date: "2026-04-10", eol: false },
      "2.6": { version: "2.6.2", release_date: "2026-02-12", eol: false },
      "2.5": { version: "2.5.1", release_date: "2025-11-20", eol: false },
      "2.4": { version: "2.4.0", release_date: "2025-08-15", eol: true },
      "2.3": { version: "2.3.0", release_date: "2025-05-10", eol: true },
      "2.2": { version: "2.2.3", release_date: "2024-12-15", eol: true }
    }
  },
  "chrome": {
    software_key: "chrome",
    aliases: ["chrome", "google chrome", "chromium"],
    canonical_name: "Google Chrome",
    source_type: "google_chrome",
    source_url: "https://chromereleases.googleblog.com/",
    latest_market_version: "154.0.8037.17",
    market_release_date: "2026-09-08",
    releases: [
      { tag: "154.0.8037.17", version: "154.0.8037.17", published_at: "2026-09-08", url: "https://chromereleases.googleblog.com/" },
      { tag: "153.0.8010.37", version: "153.0.8010.37", published_at: "2026-08-20", url: "https://chromereleases.googleblog.com/" }
    ],
    branch_patches: {
      "154": { version: "154.0.8037.17", release_date: "2026-09-08", eol: false },
      "153": { version: "153.0.8010.37", release_date: "2026-08-20", eol: false },
      "131": { version: "131.0.6778.248", release_date: "2025-01-15", eol: true },
      "130": { version: "130.0.6723.248", release_date: "2024-12-10", eol: true },
      "128": { version: "128.0.6613.138", release_date: "2024-09-10", eol: true }
    }
  },
  "edge": {
    software_key: "edge",
    aliases: ["edge", "microsoft edge"],
    canonical_name: "Microsoft Edge",
    source_type: "static",
    source_url: "https://learn.microsoft.com/en-us/deployedge/microsoft-edge-relnote-stable-channel",
    latest_market_version: "151.0.4129.59",
    market_release_date: "2026-08-12",
    releases: [
      { tag: "151.0.4129.59", version: "151.0.4129.59", published_at: "2026-08-12", url: "https://learn.microsoft.com/en-us/deployedge/microsoft-edge-relnote-stable-channel" }
    ],
    branch_patches: {
      "151": { version: "151.0.4129.59", release_date: "2026-08-12", eol: false },
      "128": { version: "128.0.2739.79", release_date: "2024-09-12", eol: true }
    }
  },
  "keda": {
    software_key: "keda",
    aliases: ["keda", "kedacore/keda"],
    canonical_name: "KEDA Event-driven Autoscaler",
    source_type: "github",
    repo: "kedacore/keda",
    source_url: "https://github.com/kedacore/keda/releases",
    latest_market_version: "2.20.2",
    market_release_date: "2026-07-31",
    releases: [
      { tag: "v2.20.2", version: "2.20.2", published_at: "2026-07-31", url: "https://github.com/kedacore/keda/releases/tag/v2.20.2" },
      { tag: "v2.20.1", version: "2.20.1", published_at: "2026-06-08", url: "https://github.com/kedacore/keda/releases/tag/v2.20.1" },
      { tag: "v2.20.0", version: "2.20.0", published_at: "2026-06-01", url: "https://github.com/kedacore/keda/releases/tag/v2.20.0" }
    ],
    branch_patches: {
      "2.20": { version: "2.20.2", release_date: "2026-07-31", eol: false },
      "2.19": { version: "2.19.0", release_date: "2026-05-20", eol: false },
      "2.18": { version: "2.18.3", release_date: "2026-03-15", eol: false },
      "2.17": { version: "2.17.4", release_date: "2026-01-10", eol: false },
      "2.16": { version: "2.16.1", release_date: "2025-10-12", eol: true },
      "2.15": { version: "2.15.2", release_date: "2025-07-08", eol: true }
    }
  },
  "kubernetes": {
    software_key: "kubernetes",
    aliases: ["kubernetes", "k8s", "aks", "azure kubernetes", "kube-proxy"],
    canonical_name: "Kubernetes Engine",
    source_type: "github",
    repo: "kubernetes/kubernetes",
    source_url: "https://github.com/kubernetes/kubernetes/releases",
    latest_market_version: "1.37.0",
    market_release_date: "2026-08-26",
    releases: [
      { tag: "v1.37.0", version: "1.37.0", published_at: "2026-08-26", url: "https://github.com/kubernetes/kubernetes/releases/tag/v1.37.0" },
      { tag: "v1.36.4", version: "1.36.4", published_at: "2026-08-20", url: "https://github.com/kubernetes/kubernetes/releases/tag/v1.36.4" },
      { tag: "v1.35.8", version: "1.35.8", published_at: "2026-08-20", url: "https://github.com/kubernetes/kubernetes/releases/tag/v1.35.8" }
    ],
    branch_patches: {
      "1.37": { version: "1.37.0", release_date: "2026-08-26", eol: false },
      "1.36": { version: "1.36.4", release_date: "2026-08-20", eol: false },
      "1.35": { version: "1.35.8", release_date: "2026-08-20", eol: false },
      "1.34": { version: "1.34.11", release_date: "2026-08-20", eol: false },
      "1.33": { version: "1.33.8", release_date: "2026-06-15", eol: false },
      "1.30": { version: "1.30.9", release_date: "2025-01-15", eol: true },
      "1.29": { version: "1.29.13", release_date: "2025-01-15", eol: true },
      "1.28": { version: "1.28.15", release_date: "2024-10-16", eol: true }
    }
  },
  "gatekeeper": {
    software_key: "gatekeeper",
    aliases: ["gatekeeper", "open-policy-agent/gatekeeper", "opa gatekeeper"],
    canonical_name: "OPA Gatekeeper",
    source_type: "github",
    repo: "open-policy-agent/gatekeeper",
    source_url: "https://github.com/open-policy-agent/gatekeeper/releases",
    latest_market_version: "3.23.1",
    market_release_date: "2026-08-27",
    releases: [
      { tag: "v3.23.1", version: "3.23.1", published_at: "2026-08-27", url: "https://github.com/open-policy-agent/gatekeeper/releases/tag/v3.23.1" },
      { tag: "v3.23.0", version: "3.23.0", published_at: "2026-07-09", url: "https://github.com/open-policy-agent/gatekeeper/releases/tag/v3.23.0" }
    ],
    branch_patches: {
      "3.23": { version: "3.23.1", release_date: "2026-08-27", eol: false },
      "3.22": { version: "3.22.2", release_date: "2026-04-27", eol: false },
      "3.18": { version: "3.18.1", release_date: "2025-02-10", eol: true }
    }
  },
  "calico": {
    software_key: "calico",
    aliases: ["calico", "tigera", "projectcalico", "calico cni"],
    canonical_name: "Tigera Calico CNI",
    source_type: "github",
    repo: "projectcalico/calico",
    source_url: "https://github.com/projectcalico/calico/releases",
    latest_market_version: "3.32.2",
    market_release_date: "2026-08-30",
    releases: [
      { tag: "v3.32.2", version: "3.32.2", published_at: "2026-08-30", url: "https://github.com/projectcalico/calico/releases/tag/v3.32.2" },
      { tag: "v3.31.7", version: "3.31.7", published_at: "2026-08-21", url: "https://github.com/projectcalico/calico/releases/tag/v3.31.7" }
    ],
    branch_patches: {
      "3.32": { version: "3.32.2", release_date: "2026-08-30", eol: false },
      "3.31": { version: "3.31.7", release_date: "2026-08-21", eol: false },
      "3.29": { version: "3.29.2", release_date: "2025-01-20", eol: true }
    }
  },
  "coredns": {
    software_key: "coredns",
    aliases: ["coredns"],
    canonical_name: "CoreDNS",
    source_type: "github",
    repo: "coredns/coredns",
    source_url: "https://github.com/coredns/coredns/releases",
    latest_market_version: "1.14.7",
    market_release_date: "2026-08-19",
    releases: [
      { tag: "v1.14.7", version: "1.14.7", published_at: "2026-08-19", url: "https://github.com/coredns/coredns/releases/tag/v1.14.7" },
      { tag: "v1.14.6", version: "1.14.6", published_at: "2026-07-10", url: "https://github.com/coredns/coredns/releases/tag/v1.14.6" }
    ],
    branch_patches: {
      "1.14": { version: "1.14.7", release_date: "2026-08-19", eol: false },
      "1.13": { version: "1.13.2", release_date: "2026-04-10", eol: false },
      "1.12": { version: "1.12.0", release_date: "2025-10-15", eol: true }
    }
  },
  "redis": {
    software_key: "redis",
    aliases: ["redis", "redis-server"],
    canonical_name: "Redis Enterprise",
    source_type: "github",
    repo: "redis/redis",
    source_url: "https://github.com/redis/redis/releases",
    latest_market_version: "8.10.1",
    market_release_date: "2026-08-17",
    releases: [
      { tag: "8.10.1", version: "8.10.1", published_at: "2026-08-17", url: "https://github.com/redis/redis/releases/tag/8.10.1" }
    ],
    branch_patches: {
      "8.10": { version: "8.10.1", release_date: "2026-08-17", eol: false },
      "8.8": { version: "8.8.2", release_date: "2026-08-17", eol: false },
      "7.4": { version: "7.4.3", release_date: "2025-09-10", eol: true }
    }
  },
  "nginx": {
    software_key: "nginx",
    aliases: ["nginx", "nginx-ingress"],
    canonical_name: "NGINX Web Server",
    source_type: "github",
    repo: "nginx/nginx",
    source_url: "https://github.com/nginx/nginx/releases",
    latest_market_version: "1.31.5",
    market_release_date: "2026-09-02",
    releases: [
      { tag: "release-1.31.5", version: "1.31.5", published_at: "2026-09-02", url: "https://github.com/nginx/nginx/releases/tag/release-1.31.5" }
    ],
    branch_patches: {
      "1.31": { version: "1.31.5", release_date: "2026-09-02", eol: false },
      "1.30": { version: "1.30.4", release_date: "2026-07-15", eol: false },
      "1.26": { version: "1.26.3", release_date: "2025-08-15", eol: true }
    }
  },
  "openssl": {
    software_key: "openssl",
    aliases: ["openssl", "libssl"],
    canonical_name: "OpenSSL Cryptographic Toolkit",
    source_type: "github",
    repo: "openssl/openssl",
    source_url: "https://github.com/openssl/openssl/releases",
    latest_market_version: "4.0.2",
    market_release_date: "2026-08-25",
    releases: [
      { tag: "openssl-4.0.2", version: "4.0.2", published_at: "2026-08-25", url: "https://github.com/openssl/openssl/releases/tag/openssl-4.0.2" }
    ],
    branch_patches: {
      "4.0": { version: "4.0.2", release_date: "2026-08-25", eol: false },
      "3.6": { version: "3.6.4", release_date: "2026-08-25", eol: false },
      "3.5": { version: "3.5.8", release_date: "2026-08-25", eol: false },
      "3.4": { version: "3.4.7", release_date: "2026-08-25", eol: false },
      "3.0": { version: "3.0.16", release_date: "2025-02-11", eol: true }
    }
  },
  "tomcat": {
    software_key: "tomcat",
    aliases: ["tomcat", "apache tomcat", "catalina"],
    canonical_name: "Apache Tomcat",
    source_type: "static",
    source_url: "https://tomcat.apache.org/",
    latest_market_version: "11.0.26",
    market_release_date: "2026-08-20",
    releases: [
      { tag: "11.0.26", version: "11.0.26", published_at: "2026-08-20", url: "https://tomcat.apache.org/" }
    ],
    branch_patches: {
      "11.0": { version: "11.0.26", release_date: "2026-08-20", eol: false },
      "10.1": { version: "10.1.34", release_date: "2026-07-15", eol: false },
      "9.0": { version: "9.0.98", release_date: "2026-06-10", eol: false }
    }
  },
  "python": {
    software_key: "python",
    aliases: ["python", "cpython", "python3"],
    canonical_name: "Python Runtime",
    source_type: "github",
    repo: "python/cpython",
    source_url: "https://www.python.org/downloads/",
    latest_market_version: "3.14.2",
    market_release_date: "2026-08-15",
    releases: [
      { tag: "v3.14.2", version: "3.14.2", published_at: "2026-08-15", url: "https://www.python.org/downloads/" }
    ],
    branch_patches: {
      "3.14": { version: "3.14.2", release_date: "2026-08-15", eol: false },
      "3.13": { version: "3.13.5", release_date: "2026-07-10", eol: false },
      "3.12": { version: "3.12.9", release_date: "2026-05-20", eol: false }
    }
  },
  "ubuntu": {
    software_key: "ubuntu",
    aliases: ["ubuntu", "ubuntu linux", "canonical ubuntu"],
    canonical_name: "Ubuntu Linux",
    source_type: "static",
    source_url: "https://ubuntu.com/about/release-cycle",
    latest_market_version: "24.04.2 LTS",
    market_release_date: "2025-02-20",
    releases: [],
    branch_patches: {
      "24.04": { version: "24.04.2 LTS", release_date: "2025-02-20", eol: false },
      "22.04": { version: "22.04.5 LTS", release_date: "2024-09-12", eol: false },
      "20.04": { version: "20.04.6 LTS", release_date: "2023-03-23", eol: true }
    }
  }
};

let vendorCatalog: Record<string, VendorSoftwareCatalogEntry> = {};
let isSyncing = false;
let lastSyncTimestamp = "";

export function getVendorCacheFilePath(): string {
  const dir = path.join(process.cwd(), "inventory");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "vendor_releases_cache.json");
}

export function loadVendorReleasesCache(): Record<string, VendorSoftwareCatalogEntry> {
  const cacheFile = getVendorCacheFilePath();
  if (fs.existsSync(cacheFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
      if (data && typeof data === "object") {
        vendorCatalog = { ...BASELINE_VENDOR_CATALOG, ...data };
        return vendorCatalog;
      }
    } catch (e) {
      console.warn("Could not parse vendor_releases_cache.json, using baseline catalog:", e);
    }
  }

  vendorCatalog = JSON.parse(JSON.stringify(BASELINE_VENDOR_CATALOG));
  saveVendorReleasesCache();
  return vendorCatalog;
}

export function saveVendorReleasesCache() {
  try {
    const cacheFile = getVendorCacheFilePath();
    fs.writeFileSync(cacheFile, JSON.stringify(vendorCatalog, null, 2));
  } catch (e) {
    console.error("Failed to save vendor_releases_cache.json:", e);
  }
}

export async function syncLiveVendorReleases(force: boolean = false): Promise<{ updated: number; message: string }> {
  if (isSyncing && !force) {
    return { updated: 0, message: "Sync already in progress" };
  }
  isSyncing = true;
  let updatedCount = 0;

  try {
    if (Object.keys(vendorCatalog).length === 0) {
      loadVendorReleasesCache();
    }

    const tasks = Object.entries(vendorCatalog).map(async ([key, entry]) => {
      try {
        if (entry.source_type === "github" && entry.repo) {
          const res = await fetch(`https://api.github.com/repos/${entry.repo}/releases?per_page=30`, {
            headers: { "User-Agent": "GovTech-PatchTracker-Engine/2.0" },
            signal: AbortSignal.timeout(10000)
          });
          if (res.ok) {
            const list: any[] = await res.json();
            const valid = list.filter((r: any) => !r.prerelease && !r.draft && r.tag_name);
            if (valid.length > 0) {
              const releaseItems: VendorReleaseItem[] = valid.map((r: any) => ({
                tag: r.tag_name,
                version: r.tag_name.replace(/^[vV]/, "").replace(/^release-/, "").replace(/^openssl-/, ""),
                published_at: r.published_at ? r.published_at.split("T")[0] : new Date().toISOString().split("T")[0],
                url: r.html_url || `https://github.com/${entry.repo}/releases/tag/${r.tag_name}`
              }));

              // Sort semantically descending
              releaseItems.sort((a, b) => compareSemver(b.version, a.version));

              const topRelease = releaseItems[0];
              if (topRelease) {
                entry.latest_market_version = topRelease.version;
                entry.market_release_date = topRelease.published_at;
                entry.releases = releaseItems;
                entry.last_checked = new Date().toISOString();

                // Group by major.minor to update branch patches
                for (const item of releaseItems) {
                  const parts = item.version.split(".");
                  if (parts.length >= 2) {
                    const branchKey = `${parts[0]}.${parts[1]}`;
                    if (!entry.branch_patches[branchKey] || compareSemver(item.version, entry.branch_patches[branchKey].version) > 0) {
                      const existingEol = entry.branch_patches[branchKey]?.eol ?? false;
                      entry.branch_patches[branchKey] = {
                        version: item.version,
                        release_date: item.published_at,
                        eol: existingEol
                      };
                    }
                  }
                }
                updatedCount++;
              }
            }
          }
        } else if (entry.source_type === "google_chrome") {
          const res = await fetch("https://versionhistory.googleapis.com/v1/chrome/platforms/win/channels/stable/versions", {
            signal: AbortSignal.timeout(10000)
          });
          if (res.ok) {
            const data: any = await res.json();
            if (data.versions && Array.isArray(data.versions) && data.versions.length > 0) {
              const top = data.versions[0];
              if (top && top.version) {
                entry.latest_market_version = top.version;
                entry.market_release_date = new Date().toISOString().split("T")[0];
                entry.last_checked = new Date().toISOString();
                const maj = top.version.split(".")[0];
                entry.branch_patches[maj] = {
                  version: top.version,
                  release_date: entry.market_release_date,
                  eol: false
                };
                updatedCount++;
              }
            }
          }
        }
      } catch (err: any) {
        // Continue with baseline/cached values gracefully
        console.warn(`Could not sync live releases for ${key}:`, err.message);
      }
    });

    await Promise.all(tasks);
    lastSyncTimestamp = new Date().toISOString();
    saveVendorReleasesCache();
  } finally {
    isSyncing = false;
  }

  return {
    updated: updatedCount,
    message: `Synchronized ${updatedCount} software vendors with upstream registries at ${lastSyncTimestamp}`
  };
}

export function findVendorSoftwareEntry(name: string): VendorSoftwareCatalogEntry | null {
  if (Object.keys(vendorCatalog).length === 0) {
    loadVendorReleasesCache();
  }
  const s = (name || "").toLowerCase().trim();

  // 1. Direct key match
  if (vendorCatalog[s]) return vendorCatalog[s];

  // 2. Alias match
  for (const entry of Object.values(vendorCatalog)) {
    for (const alias of entry.aliases) {
      if (s === alias.toLowerCase() || s.includes(alias.toLowerCase())) {
        return entry;
      }
    }
  }

  return null;
}

export interface ResolvedVendorPatch {
  matched: boolean;
  canonical_name: string;
  latest_market_version: string;
  market_version_release_date: string;
  latest_same_version_patch: string;
  same_version_patch_release_date: string;
  source_url: string;
  is_eol_branch: boolean;
  branch_key: string;
}

export function resolveVendorPatch(name: string, installedVersion: string): ResolvedVendorPatch {
  const entry = findVendorSoftwareEntry(name);
  const rawVer = (installedVersion || "1.0.0").trim();
  const cleanVer = rawVer.replace(/^[vV]/, "").replace(/^release-/, "").replace(/^openssl-/, "");
  const hasV = rawVer.startsWith("v") || rawVer.startsWith("V");

  if (!entry) {
    return {
      matched: false,
      canonical_name: name,
      latest_market_version: rawVer,
      market_version_release_date: "2026-08-11",
      latest_same_version_patch: rawVer,
      same_version_patch_release_date: "2026-08-11",
      source_url: "https://nvd.nist.gov/",
      is_eol_branch: false,
      branch_key: ""
    };
  }

  // Format market latest version with original prefix style if needed
  const latestMarket = hasV ? `v${entry.latest_market_version.replace(/^[vV]/, "")}` : entry.latest_market_version.replace(/^[vV]/, "");
  const marketDate = entry.market_release_date || "2026-08-11";

  // Derive branch key: e.g. for "1.23.0" -> "1.23", for "130.0.6723.58" -> "130"
  const parts = cleanVer.split(".");
  const branchMajorMinor = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : parts[0];
  const branchMajor = parts[0];

  let resolvedPatch = cleanVer;
  let patchDate = entry.market_release_date || "2026-08-11";
  let isEol = false;
  let matchedBranch = "";

  // Check branch patches
  if (entry.branch_patches[branchMajorMinor]) {
    const bp = entry.branch_patches[branchMajorMinor];
    resolvedPatch = bp.version;
    patchDate = bp.release_date;
    isEol = Boolean(bp.eol);
    matchedBranch = branchMajorMinor;
  } else if (entry.branch_patches[branchMajor]) {
    const bp = entry.branch_patches[branchMajor];
    resolvedPatch = bp.version;
    patchDate = bp.release_date;
    isEol = Boolean(bp.eol);
    matchedBranch = branchMajor;
  } else {
    // Search in releases for highest match on same branch
    const matchingReleases = entry.releases.filter(r => {
      const rClean = r.version.replace(/^[vV]/, "");
      return rClean.startsWith(`${branchMajorMinor}.`) || rClean === branchMajorMinor;
    });

    if (matchingReleases.length > 0) {
      matchingReleases.sort((a, b) => compareSemver(b.version, a.version));
      resolvedPatch = matchingReleases[0].version;
      patchDate = matchingReleases[0].published_at;
      matchedBranch = branchMajorMinor;
    } else {
      // Fallback: If installed version is modern/current branch, target the latest market version
      if (compareSemver(cleanVer, entry.latest_market_version) >= 0) {
        resolvedPatch = cleanVer;
        patchDate = marketDate;
      }
    }
  }

  // Ensure patch is never lower than installed version
  if (compareSemver(cleanVer, resolvedPatch) >= 0) {
    resolvedPatch = cleanVer;
  }

  const finalPatch = hasV ? `v${resolvedPatch.replace(/^[vV]/, "")}` : resolvedPatch.replace(/^[vV]/, "");

  return {
    matched: true,
    canonical_name: entry.canonical_name,
    latest_market_version: latestMarket,
    market_version_release_date: marketDate,
    latest_same_version_patch: finalPatch,
    same_version_patch_release_date: patchDate,
    source_url: entry.source_url,
    is_eol_branch: isEol,
    branch_key: matchedBranch || branchMajorMinor
  };
}
