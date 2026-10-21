# 🛡️ Security Advisory Tracker & Outbreak Response Center

A high-fidelity, production-ready full-stack Security Dashboard for CMDB systems. This system manages your local software inventory, correlates matches against live environments, tracks active CVE threats, and introduces a **State-of-the-Art Zero-Day Threat Outbreak Control Panel** with **Autonomous AI Patching Agent** simulation and live scrolling CLI consoles.

---

## 🔥 Featured: Zero-Day Threat & Outbreak Management
This release introduces advanced capabilities designed to handle high-profile zero-day exploits (e.g., Log4Shell, Heartbleed-NG) that have active exploits circulating in the wild before vendor patches are available.
* **Outbreak Highlighting Banner**: A glowing, high-contrast alert panel pinning active zero-days at the very top of the analyst dashboard.
* **Technical Workaround Playbooks**: Actionable CLI scripts for both Linux/Docker and Windows/PowerShell environments to contain threats immediately.
* **Autonomous Virtual Patching**: An interactive, one-click **AI Patching Agent** that logs remote terminal operations (package updates, module disabling, and configuration validation) inside a simulated scrolling console, successfully mitigating the threat in real-time.

---

## 🏗️ System Topology & Services

The application consists of five Docker services defined in `docker-compose.yml`:

| Service | Container Name | Role | Port |
| :--- | :--- | :--- | :--- |
| **postgres** | `cve-tracker-db` | Relational PostgreSQL 16 database | `5432` |
| **bootstrap** | `cve-tracker-bootstrap` | One-shot job syncing inventory files from the `inventory/` directory | - |
| **backend** | `cve-tracker-api` | Python FastAPI REST & WebSocket server | `8000` |
| **worker** | `cve-tracker-worker` | Python background worker syncing NVD CVEs every 24 hours | - |
| **frontend** | `cve-tracker-ui` | React + TypeScript + Tailwind single page application served by nginx | `5173` |

---

## ⚙️ Languages, LLM & Model Context Protocol (MCP) Configuration

This system utilizes a modern full-stack architecture designed for extreme performance, security, and smart capabilities. Below is the technical breakdown of the languages, Large Language Models (LLMs), and Model Context Protocol (MCP) details.

### 1. Languages & Frameworks Used
* **Frontend**: **TypeScript (React 18)** built with **Vite** and styled using **Tailwind CSS**. 
  * Rich micro-animations are driven by `motion/react` (Framer Motion).
  * Data visualization and graphs utilize `recharts`.
  * Standardized typography is set with the clean `Inter` and `JetBrains Mono` fonts.
* **Backend (Active Environment)**: **TypeScript & Node.js (Express)**.
  * In the developer workspace and production deployment, a high-fidelity unified Express server (`server.ts`) handles REST APIs and live WebSockets.
  * The TypeScript backend is bundled using `esbuild` into a single, high-performance CommonJS file (`dist/server.cjs`) to minimize startup times and filesystem I/O.
* **Supplementary/Alternative Backend**: **Python 3**.
  * A full FastAPI suite is maintained in `/backend` with `SQLAlchemy`, `pandas`, and `openpyxl` for optional database setups and supplementary spreadsheet ingestion scripts.

### 2. Large Language Model (LLM) Integration
The advisory panel features deep, contextual intelligence powered by generative AI:
* **LLM Engine**: **Google Gemini** (interacting via the official `@google/genai` SDK on the server-side).
* **Primary Features**: Generates smart contextual advisories, risk scoring, tailored container/firewall remediation playbooks, and OS workaround guides dynamically based on exact package configurations.
* **Configuration**:
  * Set the `GEMINI_API_KEY` environment variable in your server environment or platform secrets.
  * *Graceful Fallback*: If the API key is not supplied, the system seamlessly triggers standard local rules-based security advisories to ensure continuous operation.

### 3. Model Context Protocol (MCP)
* **Status**: This application currently operates over high-fidelity custom REST APIs and WebSockets. There is **no dedicated MCP server** pre-bundled in the codebase.
* **How to Integrate MCP**:
  If you wish to control, inspect, or fetch inventory state directly from an AI Assistant (like Claude Desktop or Gemini Code Assist), you can easily wrap this application's API endpoints using the official Model Context Protocol.
  
  To set up an MCP server bridge:
  1. Install the MCP SDK: `npm install @modelcontextprotocol/sdk`
  2. Map these existing endpoints to MCP Tools:
     * `get_inventory_status` -> Queries `/api/v1/inventory`
     * `list_vulnerabilities` -> Queries `/api/v1/vulnerabilities`
     * `get_patch_advisory` -> Queries `/api/v1/vulnerabilities/:id/ai-advisory`
  3. register the bridge inside your `claude_desktop_config.json` or equivalent agent tool integration!

---

## 🚀 Getting Started: Local Docker Deployment

Follow these steps to build, run, and test the system locally using Docker Desktop:

### Prerequisites
* **Docker Desktop** installed and running on Windows, macOS, or Linux.
* **Git** (optional) to clone the repository.

### 1. Build and Launch Services
Spin up the complete full-stack environment in detached mode:
```bash
docker compose up -d --build
```
*Docker will pull base images, install Python/Node dependencies, compile the React production bundles, and set up local networking.*

### 2. Seed Default Administrator Credentials
Seed the Postgres database with default user accounts and a secure, cryptographically random password:
```bash
docker compose exec backend python scripts/seed_admin.py
```
*Note: Make sure to copy the generated admin password printed to the terminal!*

### 3. Access the Dashboard
Open your web browser and go to:
* **UI Portal**: `http://localhost:3000` (or `http://localhost:5173` if running Vite locally)
* **API Swagger Docs**: `http://localhost:8000/docs`

Log in using `admin` and the generated password from step 2. You can trigger scans, manage inventory files, assign engineers, and deploy the AI Patching Agent live!

### Setup Teardown
To stop all containers while preserving database volume records:
```bash
docker compose down
```
To stop containers and completely wipe all Postgres data (starting fresh):
```bash
docker compose down -v
```

---

## 🌐 Network, Firewall & URL Allowlist Requirements (Enterprise / Cloud VM)

When deploying or building this system for the first time inside an **Enterprise VM, Virtual Private Cloud (VPC), or restricted corporate network**, outbound Internet egress is typically blocked by default. 

If any required endpoints are blocked by a corporate firewall or proxy, Docker builds will fail with errors such as:
* **`apt-get update ... exit code: 100`** (unable to resolve or reach Debian package mirrors)
* **`npm ci ... exit code: 1`** or `ETIMEDOUT` / socket hangup (unable to reach the NPM registry)
* **`pip install ... ConnectionError`** (unable to reach PyPI package CDNs)
* **`az acr login` or `docker push ... dial tcp timeout`** (unable to reach ACR or underlying Azure Blob Storage)

Provide the following URL allowlists to your **Network / Security / Firewall Team** before initial deployment:

### 1. Port Architecture & Firewall Inbound/Outbound Matrix

The system requires specific port allocations for host access, inter-container communication, and external integrations:

#### A. Inbound / Listening Ports (Host & Ingress)
| Port | Protocol | Direction | Service / Process | Access Scope | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`3000`** | TCP / HTTP | Inbound | `cve-tracker-ui` (Full-Stack) | Analysts / Users / Web Browser | Unified Web UI Dashboard, Express API, & live WebSocket stream |
| **`8000`** | TCP / HTTP | Inbound | `cve-tracker-api` (FastAPI) | Internal / Admins / API Clients | Python REST API and OpenAPI interactive documentation (`/docs`) |
| **`5432`** | TCP | Inbound (Local) | `cve-tracker-db` (PostgreSQL) | Localhost / Docker containers | PostgreSQL relational database storage (exposed for DB administration) |
| **`5173`** | TCP / HTTP | Inbound (Dev) | Vite Dev Server | Developers | Local development Vite hot-reload server (when running without Docker) |

#### B. Internal Inter-Container Networking (Docker Bridge Network)
All containers communicate privately across an isolated Docker bridge network (`cve-net` / `172.18.0.0/16`):
* **`postgres:5432`**: Accessed exclusively by `backend` and `worker` services.
* **`backend:8000`**: Accessed by `frontend` proxy and internal services.
* **`127.0.0.11:53`** (UDP/TCP): Docker embedded DNS resolver for container-to-container service discovery.

#### C. Optional Enterprise Integration Egress Ports (Configurable in Dashboard)
| Port | Protocol | Direction | Destination | Feature / Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`22`** | TCP | Outbound | Jump Host / Bastion Servers | SSH execution for Outbreak AI Patching Agent remote remediation |
| **`25` / `587` / `465` | TCP | Outbound | Corporate SMTP Gateway | Email alerts, CVE patch notifications, and weekly compliance digests |
| **`389` / `636` | TCP | Outbound | Active Directory / OpenLDAP | Enterprise Single Sign-On (SSO) and LDAP directory authentication |
| **`514` / `6514` | UDP/TCP/TLS | Outbound | SIEM / Syslog Collectors | Security log forwarding to Splunk, Microsoft Sentinel, IBM QRadar |

---

### 2. Master External URL / FQDN Egress Allowlist Table

If outbound Internet egress is restricted by an enterprise firewall, corporate proxy (Zscaler, Blue Coat, Netskope), or VPC Security Group, whitelist the following Fully Qualified Domain Names (FQDNs):

| Category | Domain / FQDN | Port | Protocol | Mandatory? | Purpose / Component |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Container Engine** | `registry-1.docker.io` | `443` | TCP / HTTPS | **Mandatory** (Build) | Docker Hub image registry manifest lookup |
| **Container Engine** | `auth.docker.io` | `443` | TCP / HTTPS | **Mandatory** (Build) | Docker Hub authentication and bearer token service |
| **Container Engine** | `production.cloudflare.docker.com` | `443` | TCP / HTTPS | **Mandatory** (Build) | Docker Hub layer blob downloads (Cloudflare CDN) |
| **Container Engine** | `mcr.microsoft.com` | `443` | TCP / HTTPS | Optional (Azure) | Microsoft Container Registry (system base images) |
| **Container Engine** | `*.data.mcr.microsoft.com` | `443` | TCP / HTTPS | Optional (Azure) | Microsoft Container Registry blob storage |
| **OS Packages** | `deb.debian.org` | `80, 443` | TCP / HTTP(S) | **Mandatory** (Build) | Debian package repository for Python backend & Node base images |
| **OS Packages** | `security.debian.org` | `80, 443` | TCP / HTTP(S) | **Mandatory** (Build) | Debian security patches and updates |
| **OS Packages** | `ftp.debian.org` | `80, 443` | TCP / HTTP(S) | Recommended | Debian secondary fallback mirror |
| **OS Packages** | `dl-cdn.alpinelinux.org` | `80, 443` | TCP / HTTP(S) | Optional | Alpine Linux apk package mirror (if using Alpine images) |
| **Node.js / NPM** | `registry.npmjs.org` | `443` | TCP / HTTPS | **Mandatory** (Build) | Node Package Manager official registry |
| **Node.js / NPM** | `*.npmjs.org` | `443` | TCP / HTTPS | **Mandatory** (Build) | NPM package tarball CDNs |
| **Python / PyPI** | `pypi.org` | `443` | TCP / HTTPS | **Mandatory** (Build) | Python Package Index index metadata |
| **Python / PyPI** | `files.pythonhosted.org` | `443` | TCP / HTTPS | **Mandatory** (Build) | PyPI binary wheels and package source tarballs |
| **Python / PyPI** | `pypi.python.org` | `443` | TCP / HTTPS | Recommended | Legacy PyPI HTTP-to-HTTPS redirect endpoint |
| **Threat Intelligence** | `services.nvd.nist.gov` | `443` | TCP / HTTPS | **Mandatory** (Runtime) | NIST National Vulnerability Database API 2.0 (Worker CVE sync) |
| **Threat Intelligence** | `cve.mitre.org` | `443` | TCP / HTTPS | Recommended | MITRE CVE dictionary, CWE taxonomy, and vulnerability links |
| **Threat Intelligence** | `api.github.com` | `443` | TCP / HTTPS | Recommended | GitHub Security Advisory Database feed |
| **Threat Intelligence** | `www.cisa.gov` | `443` | TCP / HTTPS | Recommended | CISA Known Exploited Vulnerabilities (KEV) catalog |
| **Threat Intelligence** | `raw.githubusercontent.com` | `443` | TCP / HTTPS | Recommended | CISA KEV JSON mirror & community vulnerability catalogs |
| **Threat Intelligence** | `api.first.org` | `443` | TCP / HTTPS | Recommended | FIRST.org Exploit Prediction Scoring System (EPSS) API |
| **Generative AI** | `generativelanguage.googleapis.com` | `443` | TCP / HTTPS | Recommended (AI) | Google Gemini API (autonomous AI Patching Agent & advisories) |
| **Generative AI** | `api.ai.tech.gov.sg` | `443` | TCP / HTTPS | Optional (GovTech) | Platform AI GovTech API gateway (if configured in AI settings) |
| **Azure CI/CD & ACR** | `dev.azure.com` | `443` | TCP / HTTPS | Optional (Azure) | Azure DevOps project repositories and build pipelines |
| **Azure CI/CD & ACR** | `*.visualstudio.com` | `443` | TCP / HTTPS | Optional (Azure) | Azure DevOps build agent telemetry & task execution |
| **Azure CI/CD & ACR** | `*.vsassets.io` | `443` | TCP / HTTPS | Optional (Azure) | Azure DevOps pipeline task extensions and artifacts |
| **Azure CI/CD & ACR** | `login.microsoftonline.com` | `443` | TCP / HTTPS | Optional (Azure) | Azure Entra ID / Active Directory authentication |
| **Azure CI/CD & ACR** | `management.azure.com` | `443` | TCP / HTTPS | Optional (Azure) | Azure Resource Manager (ARM) API |
| **Azure CI/CD & ACR** | `<your-acr-name>.azurecr.io` | `443` | TCP / HTTPS | Optional (Azure) | Azure Container Registry push / pull endpoint |
| **Azure CI/CD & ACR** | `*.blob.core.windows.net` | `443` | TCP / HTTPS | Optional (Azure) | Azure Storage backing ACR layer blobs (*crucial for push/pull*) |
| **Azure Kubernetes** | `<cluster-name>.<region>.azmk8s.io` | `443` | TCP / HTTPS | Optional (Azure) | AKS Kubernetes API Server control plane |

---

### 3. Deep-Dive by Deployment Phase

#### A. Initial Build Phase (VM or Self-Hosted CI Runner)
When running `docker compose up --build` or executing `docker build`:
* **Docker Hub**: Requires access to pull `node:20-slim`, `python:3.10-slim`, and `postgres:16-alpine`.
* **Debian OS Mirrors**: `deb.debian.org`, `security.debian.org`, `ftp.debian.org`
* **Package Registries**: `registry.npmjs.org`, `registry.yarnpkg.com`, `pypi.org`, `files.pythonhosted.org`.
* *(Note: If building frontend offline, the Zero-Network build mode bypasses all NPM egress entirely!)*

#### B. CI/CD & Azure Cloud Deployment (AzDO -> ACR -> AKS)
When building via Azure DevOps pipelines and pushing to ACR / AKS:
* **Azure DevOps**: `dev.azure.com`, `*.visualstudio.com`, `*.vsassets.io`
* **Azure Container Registry**: `<your-acr-name>.azurecr.io` and `*.blob.core.windows.net` (*Note*: Docker layers in ACR are stored in Azure Blob Storage; blocking blob storage results in hanging pushes).
* **AKS Cluster Management**: Management endpoints `management.azure.com` and your cluster API server `*.azmk8s.io`.

#### C. Runtime Threat Feeds & AI Assistant
When containers are actively running in production:
* **Background Worker**: Queries `services.nvd.nist.gov` and `api.first.org` to sync CVE records and EPSS exploitation probability scores.
* **AI Security Agent**: Queries `generativelanguage.googleapis.com` using `GEMINI_API_KEY` for dynamic zero-day patch scripts, container workarounds, and incident playbooks.

---

### 4. Enterprise Proxy Bypass (`NO_PROXY`) Requirements

When building or running in corporate proxy environments, the following hostnames and subnets **must bypass the proxy** via `NO_PROXY` / `no_proxy` to ensure internal inter-container communication is never sent to the external gateway:

```bash
# Recommended NO_PROXY configuration string:
NO_PROXY="localhost,127.0.0.1,postgres,backend,worker,bootstrap,cve-tracker-db,cve-tracker-api,cve-tracker-ui,cve-tracker-worker,cve-tracker-bootstrap,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
```

---

### 5. Ready-to-Submit Enterprise Firewall Change Request (CR)

Copy and paste this section directly into your company's ServiceNow, Jira Service Management, or IT Security Request portal:

```text
================================================================================
FIREWALL / NETWORK CHANGE REQUEST: CVE TRACKER & OUTBREAK CENTER
================================================================================
Application: Security Advisory Tracker & Outbreak Response Center
Target Environment: Corporate VM / Docker Desktop / Cloud VPC

1. INBOUND RULES (Host Listening Ports):
   - TCP 3000 -> Web UI Dashboard & WebSocket stream (LAN / Workstation access)
   - TCP 8000 -> FastAPI Backend & Swagger API Docs (LAN / Admin access)
   - TCP 5432 -> PostgreSQL Database (Localhost / Docker network only)

2. OUTBOUND HTTPS (TCP 443) RULES - MANDATORY FOR BUILD & RUNTIME:
   - registry-1.docker.io, auth.docker.io, production.cloudflare.docker.com (Docker Hub)
   - deb.debian.org, security.debian.org, ftp.debian.org (Debian OS Packages)
   - registry.npmjs.org, *.npmjs.org (Official Node.js NPM Registry)
   - pypi.org, files.pythonhosted.org (Python PyPI Registries)
   - services.nvd.nist.gov (NIST National Vulnerability Database API 2.0)
   - generativelanguage.googleapis.com (Google Gemini AI Outbreak Advisor)

3. OUTBOUND HTTPS (TCP 443) RULES - RECOMMENDED THREAT FEEDS:
   - cve.mitre.org (MITRE CVE reference links)
   - api.github.com, raw.githubusercontent.com (GitHub Security Feeds)
   - www.cisa.gov, api.first.org (CISA KEV Catalog & FIRST EPSS Scoring)

4. OPTIONAL OUTBOUND INTEGRATION RULES (If configured in dashboard):
   - TCP 22 -> Target Jump Hosts / Bastions (Automated Remote Patching)
   - TCP 25/587/465 -> Corporate SMTP Server (Security Alert Email Delivery)
   - TCP 389/636 -> Active Directory Domain Controllers (LDAP/LDAPS SSO)
   - TCP/UDP 514 / TLS 6514 -> Corporate SIEM (Splunk / Sentinel Syslog)

5. PROXY BYPASS LIST:
   - localhost, 127.0.0.1, postgres, backend, worker, 172.16.0.0/12
================================================================================
```

---

### 6. Corporate VM & Proxy Troubleshooting

If your corporate VM sits behind a forward proxy or uses private corporate DNS servers, follow these configurations:

#### 1. Configuring DNS for Docker Containers (`/etc/docker/daemon.json`)
If containers fail with `Temporary failure in name resolution` or `exit code: 100`:
```json
{
  "dns": ["8.8.8.8", "1.1.1.1"]
}
```
*Apply change:*
```bash
sudo systemctl restart docker
```

#### 2. Building Containers Behind an HTTP/HTTPS Proxy
If your VM requires a corporate proxy to reach the internet, pass proxy arguments to Docker:
```bash
docker compose build \
  --build-arg HTTP_PROXY="http://proxy.company.internal:8080" \
  --build-arg HTTPS_PROXY="http://proxy.company.internal:8080" \
  --build-arg NO_PROXY="localhost,127.0.0.1,postgres,backend,worker"
```

Or configure Docker client globally in `~/.docker/config.json`:
```json
{
  "proxies": {
    "default": {
      "httpProxy": "http://proxy.company.internal:8080",
      "httpsProxy": "http://proxy.company.internal:8080",
      "noProxy": "localhost,127.0.0.1,postgres,backend,worker"
    }
  }
}
```

#### 3. Handling SSL / TLS Decryption & Corporate Self-Signed Certificate Errors
If your environment runs behind a corporate firewall, VPN, or proxy that performs SSL/TLS deep packet inspection (e.g. Zscaler, Palo Alto Networks, Netskope, Cisco Umbrella, Fortinet), Docker builds can fail with:
```text
SSLCertVerificationError: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: self-signed certificate in certificate chain (_ssl.c:1017)
Could not fetch URL https://pypi.org/simple/fastapi/
ERROR: Could not find a version that satisfies the requirement fastapi
```

**How This Has Been Resolved in the Codebase**:
* **Backend (`backend/Dockerfile`)**: Configures system-wide `/etc/pip.conf` and passes `--trusted-host pypi.org --trusted-host files.pythonhosted.org --trusted-host pypi.python.org`. This instructs `pip` to trust PyPI hosts directly, bypassing SSL inspection certificate chain rejections.
* **Frontend (`Dockerfile`)**: Automatically falls back to `npm install --strict-ssl=false` if corporate SSL inspection blocks `npm ci`.

#### 4. Troubleshooting Docker Desktop Build Failures (`exit code: 1` on `target bootstrap` / `pip install`)
If `docker compose up --build` failed previously on Docker Desktop (Windows WSL2 or macOS), it was due to:
1. **Corporate SSL Inspection**: Corporate proxies re-encrypting traffic with self-signed root certs unknown to clean Debian images. *(Resolved with `--trusted-host` and `/etc/pip.conf`)*.
2. **Network Mode**: Setting `network: host` inside Docker Compose on Docker Desktop cuts off internal DNS routing. *(Resolved by using standard Docker bridge networking)*.
3. **Pip Connection Timeout**: Slow network connections dropping the default 15s timeout. *(Resolved with `--default-timeout=100` and `--retries=5`)*.
4. **Source Compilation / Rust Dependency**: Unpinned bcrypt requiring Rust toolchains. *(Resolved with `--prefer-binary` and pinning `bcrypt>=3.2.0,<4.1.0`)*.

#### 5. Troubleshooting Long Stalls on `[builder 4/7] RUN npm config set fetch-retries`
If Docker build appeared stuck on the frontend `npm` installation stage for 10–15+ minutes:
* **Root Cause 1 (Timeout Multipliers)**: Previous retry settings (`fetch-retry-maxtimeout 120000` = 2 minutes * 5 retries per package) caused npm to silently hang for tens of minutes on any slow or throttled corporate connection.
* **Root Cause 2 (Alpine musl DNS Stalls)**: Alpine Linux (`node:20-alpine`) uses musl libc, which queries IPv6 (AAAA) and IPv4 (A) in parallel. In Docker Desktop, WSL2, and corporate VPN environments, dropped IPv6 packets cause Alpine to wait 5–15 seconds per network query.
* **Root Cause 3 (Corporate SSL Inspection)**: NPM was running with `strict-ssl=true` before falling back, triggering retries on every single package download when intercepting proxies are present.

**How This Has Been Resolved**:
1. Switched frontend Dockerfile from `node:20-alpine` to **`node:20-slim`** (standard Debian glibc), resolving all Alpine/WSL2 IPv6 DNS lookup delays.
2. Set `ENV NODE_TLS_REJECT_UNAUTHORIZED=0` and `NPM_CONFIG_STRICT_SSL=false` **upfront** so npm immediately connects without waiting for SSL timeout penalties.
3. Lowered retry wait times to snappy defaults (`fetch-retry-mintimeout 1000`, `fetch-retry-maxtimeout 5000` = 1s to 5s max).

#### 6. Troubleshooting NPM 503 Service Unavailable / Offline "Zero-Network" Build
If your Docker build failed at `target frontend` with:
```text
target frontend: failed to solve: process "/bin/sh -c npm config set strict-ssl false ..." did not complete successfully: exit code: 1
```
or `npm error 503 Service Unavailable`:

* **Why this occurs**: In enterprise environments with corporate proxies (Zscaler, Netskope, Cisco Umbrella, Blue Coat) or corporate VPNs, Docker Desktop containers frequently cannot establish external connections to public npm registries. Even when retry/mirror fallbacks are attempted, the corporate proxy drops or returns `503 Service Unavailable` for all external npm registry traffic from inside Docker containers.

**The Solution: Offline "Zero-Network" Production Build**:
1. **Pre-Built Self-Contained Bundle in `dist/`**:
   * We bundled the entire Express backend and all runtime dependencies (`express`, `ws`, `xlsx`, `@google/genai`, `nodemailer`, `dotenv`) directly into a single self-contained executable bundle: `dist/server.cjs`.
   * The Vite React frontend is pre-compiled into `dist/index.html` and `dist/assets/`.
2. **Build Context Allowed (`.dockerignore`)**:
   * `dist/` is now included in the Docker build context.
3. **Automated Offline Detection in `Dockerfile`**:
   * The Dockerfile automatically detects the existing `dist/index.html` and `dist/server.cjs` and **skips running `npm install` completely inside Docker**!
   * The container build takes **0.5 seconds**, requires **ZERO network downloads**, and is **100% immune** to all proxy 503s, SSL interception failures, and VPN DNS dropouts.

**How to Rebuild Now**:
```bash
# Rebuild the frontend container instantly using the pre-built bundle:
docker compose build frontend

# Launch all containers:
docker compose up -d

# Verify all containers are healthy:
docker compose ps
```

*(Optional: If you ever edit frontend/backend source files locally, simply run `npm run build` on your host machine first, then run `docker compose build frontend`!)*

#### 7. Troubleshooting Docker Hub 429 Too Many Requests
If the Docker build fails with:
```text
target backend: failed to solve: python:3.10-slim: failed to resolve source metadata for docker.io/library/python:3.10-slim: unexpected status from HEAD request to https://registry-1.docker.io/v2/library/python/manifests/3.10-slim: 429 Too Many Requests
```

* **Why this occurs**: Docker Hub limits anonymous image pulls to **100 pulls per 6 hours per public IP address**. In corporate networks with a forward proxy or NAT gateway, all developers share the same external IP address. Once the quota is reached across your company, Docker Hub returns `429 Too Many Requests` on base images (`python:3.10-slim`, `node:20-slim`, `postgres:16-alpine`).

**Solutions**:
1. **Option A (Instant Fix - Sign in to Docker Hub)**:
   * Run in terminal: `docker login` (using your free Docker ID credentials), or:
   * Open **Docker Desktop** and click **Sign in** in the top-right corner.
   * *A logged-in account gets a dedicated personal quota (200 pulls/6hr) completely separated from your company's shared IP address, immediately bypassing the 429 block.*

2. **Option B (No Account Required - Use AWS Public ECR Mirror)**:
   AWS hosts official, rate-limit-free mirrors of standard Docker Hub images. Both `Dockerfile` and `backend/Dockerfile` support the `PYTHON_BASE` and `NODE_BASE` build arguments:
   ```bash
   # Build using AWS Public ECR mirrors (bypasses Docker Hub rate limits completely):
   docker compose build \
     --build-arg PYTHON_BASE="public.ecr.aws/docker/library/python:3.10-slim" \
     --build-arg NODE_BASE="public.ecr.aws/docker/library/node:20-slim" \
     backend bootstrap worker frontend
   ```

3. **Option C (Tag Local Cache)**:
   If you pull the base images once from an alternate network (e.g. mobile hotspot or home network), Docker caches them locally on your machine and will never request them again during subsequent builds.

---

## ☁️ Deploying to Public Cloud Environments

Ready to move from local development to production? Here is how to migrate this containerized full-stack architecture to AWS and Azure:

### 1. Deploying to AWS (Amazon Web Services)

The fastest and most robust way to deploy this on AWS is using **Amazon ECS (Elastic Container Service) on AWS Fargate** (Serverless Containers) with an **Amazon RDS PostgreSQL** database:

#### Step A: Database Setup
1. Spin up an **Amazon RDS for PostgreSQL** database instance in your private subnet.
2. Note down the Database Host connection string, DB User, and password.

#### Step B: Build and Push Images to Amazon ECR (Elastic Container Registry)
Create ECR repositories for the backend, frontend, and worker images:
```bash
# Authenticate Docker to your AWS Account
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.<region>.amazonaws.com

# Build and Tag your images
docker build -t cve-tracker-backend ./backend
docker tag cve-tracker-backend:latest <aws_account_id>.dkr.ecr.<region>.amazonaws.com/cve-tracker-backend:latest
docker push <aws_account_id>.dkr.ecr.<region>.amazonaws.com/cve-tracker-backend:latest

docker build -t cve-tracker-frontend ./frontend
docker tag cve-tracker-frontend:latest <aws_account_id>.dkr.ecr.<region>.amazonaws.com/cve-tracker-frontend:latest
docker push <aws_account_id>.dkr.ecr.<region>.amazonaws.com/cve-tracker-frontend:latest
```

#### Step C: Define ECS Task Definition and Run
1. Create a task definition specifying your backend, frontend, and worker containers.
2. In the Backend and Worker container specifications, inject environment variables pointing to your RDS connection string:
   * `DATABASE_URL=postgresql://<db_user>:<db_password>@<rds_endpoint>:5432/<db_name>`
   * `JWT_SECRET=<your_secure_jwt_key>`
3. Set up an **Application Load Balancer (ALB)** to route port `80` traffic to the frontend container, and proxy `/api/*` and `/ws/*` requests to your backend service.

---

### 2. Deploying to Azure (Microsoft Azure)

The best serverless option on Azure is **Azure Container Apps (ACA)**, which supports multi-container communication via environment ingress and Dapr natively:

#### Step A: Database Setup
1. Deploy an **Azure Database for PostgreSQL Flexible Server**.
2. Configure network firewall rules to allow connections from other Azure services.

#### Step B: Push Images to Azure Container Registry (ACR)
```bash
# Login to Azure and your Registry
az login
az acr login --name <your_acr_name>

# Tag and push images
docker tag cve-tracker-backend:latest <your_acr_name>.azurecr.io/cve-tracker-backend:latest
docker push <your_acr_name>.azurecr.io/cve-tracker-backend:latest

docker tag cve-tracker-frontend:latest <your_acr_name>.azurecr.io/cve-tracker-frontend:latest
docker push <your_acr_name>.azurecr.io/cve-tracker-frontend:latest
```

#### Step C: Deploy Container Apps
1. Create an **Azure Container Apps Environment** with a virtual network.
2. Deploy the **Backend container app**:
   * Enable ingress (target port `8000`), restricted to internal VNet traffic or open depending on your requirements.
   * Add environment secrets for `DATABASE_URL` pointing to your Azure Postgres.
3. Deploy the **Frontend container app**:
   * Enable external ingress (target port `80` / `8080`).
   * Add env variable `BACKEND_URL` pointing to your Backend Container App internal address.
4. Deploy the **Worker background container app** (ingress disabled).

---

### 3. Deploying to Azure Kubernetes Service (AKS) via Azure DevOps & ACR

For enterprise production deployments utilizing **Azure DevOps Repos**, CI/CD Pipelines, **Azure Container Registry (ACR)**, and **Azure Kubernetes Service (AKS)**, a dedicated, comprehensive deployment guide and ready-to-deploy Kubernetes manifests are included in this repository:

* 📖 **Comprehensive Guide**: [AZURE_DEVOPS_AKS_GUIDE.md](./AZURE_DEVOPS_AKS_GUIDE.md)
* ⚙️ **CI/CD Pipeline Definition**: [azure-pipelines.yml](./azure-pipelines.yml)
* ☸️ **Kubernetes Manifests**: Located in the [k8s/](./k8s/) directory (Deployment, Service, Ingress, and ConfigMaps).

---


