# Step-by-Step Guide: Azure DevOps Repos -> Azure Container Registry (ACR) -> Azure Kubernetes Service (AKS)

This guide walks you through migrating and hosting this codebase in **Azure DevOps (AzDO) Repos**, building and pushing container images to **Azure Container Registry (ACR)**, and deploying to **Azure Kubernetes Service (AKS)** using an automated CI/CD pipeline.

---

## 1. High-Level Architecture

```
┌─────────────────────────┐       ┌─────────────────────────┐
│   Azure DevOps Repos    │ ────> │ Azure DevOps Pipelines  │
│      (Git Source)       │       │    (Build & Push CI)    │
└─────────────────────────┘       └───────────┬─────────────┘
                                              │
                                              ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│ Azure Kubernetes Service│ <──── │ Azure Container Registry│
│     (AKS Cluster)       │       │       (ACR Images)      │
│  - Namespace:sec-advisor│       └─────────────────────────┘
│  - 2 Replicas / Rolling │
└─────────────────────────┘
```

---

> ℹ️ **Firewall & Network Allowlist Prerequisite**: If your build agents, VMs, or AKS cluster nodes run within a restricted corporate network or behind a proxy, review the required egress domains (Azure DevOps, ACR, MCR, AKS API server, npm, apt, and PyPI) in the **[README.md Network Requirements](./README.md#-network-firewall--url-allowlist-requirements-enterprise--cloud-vm)**.

---

## 2. Step-by-Step Instructions

### Step 1: Push Code to Azure DevOps Repo

1. In your **Azure DevOps Organization** (`https://dev.azure.com/{YourOrg}`), open your Project.
2. Navigate to **Repos** > **Files**. If no repo exists yet, click the repo dropdown at the top and select **New repository** (e.g. `sec-advisor`).
3. Copy the Git Clone URL (HTTPS or SSH).
4. In your terminal, initialize Git in the application folder and push:

```bash
# Initialize git (if not already done)
git init

# Add remote pointing to your Azure DevOps repository
git remote add origin https://{YourOrg}@dev.azure.com/{YourOrg}/{YourProject}/_git/sec-advisor

# Add all files, commit, and push
git add .
git commit -m "Initial commit: full-stack Sec Advisor with Dockerfile and K8s manifests"
git branch -M main
git push -u origin main
```

---

### Step 2: Create Azure Resources (ACR & AKS) via Azure CLI

If you do not already have an ACR and AKS cluster, create them using the Azure CLI:

```bash
# 1. Log in to Azure
az login

# 2. Set variables
export RG="rg-secadvisor-prod"
export LOCATION="eastus"              # or southeastasia, westeurope, etc.
export ACR_NAME="secadvisoracr$RANDOM" # Must be globally unique, alphanumeric only
export AKS_CLUSTER="aks-secadvisor-cluster"

# 3. Create Resource Group
az group create --name $RG --location $LOCATION

# 4. Create Azure Container Registry (ACR)
az acr create \
  --resource-group $RG \
  --name $ACR_NAME \
  --sku Standard \
  --admin-enabled true

# 5. Create Azure Kubernetes Service (AKS) cluster
az aks create \
  --resource-group $RG \
  --name $AKS_CLUSTER \
  --node-count 2 \
  --node-vm-size Standard_D2s_v5 \
  --generate-ssh-keys \
  --enable-managed-identity
```

---

### Step 3: Attach ACR to AKS (Allow AKS to pull images)

Attaching ACR to AKS grants the managed identity of AKS the `AcrPull` role automatically, removing the need to manage manual imagePullSecrets:

```bash
az aks update \
  --resource-group $RG \
  --name $AKS_CLUSTER \
  --attach-acr $ACR_NAME
```

---

### Step 4: Configure Service Connections in Azure DevOps

Azure DevOps Pipelines need permissions to push to ACR and deploy to AKS.

#### A. Create ACR Docker Registry Service Connection
1. In Azure DevOps, go to **Project Settings** (bottom left corner) > **Service connections** > **New service connection**.
2. Select **Docker Registry** > click **Next**.
3. Choose **Azure Container Registry**:
   - **Subscription**: Select your Azure subscription.
   - **Azure container registry**: Select your ACR name (e.g. `secadvisoracr...`).
   - **Service connection name**: Enter `acr-service-connection` (matches `azure-pipelines.yml`).
   - Check **Grant access permission to all pipelines**.
4. Click **Save**.

#### B. Create AKS Kubernetes Service Connection
1. Under **Service connections**, click **New service connection**.
2. Select **Kubernetes** > click **Next**.
3. Choose **Azure Subscription**:
   - **Subscription**: Select your Azure subscription.
   - **Cluster**: Select your AKS cluster name (`aks-secadvisor-cluster`).
   - **Namespace**: Enter `sec-advisor`.
   - **Service connection name**: Enter `aks-service-connection` (matches `azure-pipelines.yml`).
   - Check **Grant access permission to all pipelines**.
4. Click **Save**.

---

### Step 5: Configure and Run the CI/CD Pipeline

The pipeline is pre-configured in `azure-pipelines.yml`.

1. In Azure DevOps, navigate to **Pipelines** > **Pipelines** > **New pipeline**.
2. Select **Azure Repos Git** > choose your repository (`sec-advisor`).
3. Select **Existing Azure Pipelines YAML file**.
4. Set path to `/azure-pipelines.yml` and click **Continue**.
5. Update the two variables at the top of the YAML if your names differ:
   - `containerRegistry`: `your-acr-name.azurecr.io`
   - `dockerRegistryServiceConnection`: `acr-service-connection`
   - `kubernetesServiceConnection`: `aks-service-connection`
6. Click **Run**.

The pipeline executes in two automated stages:
- **BuildAndPush**: Builds the multi-stage Docker image and pushes both `latest` and `$(Build.BuildId)` tags to your ACR.
- **DeployToAKS**: Injects the container image tag into `k8s/deployment.yaml` and applies all manifests (`namespace.yaml`, `deployment.yaml`, `service.yaml`, `ingress.yaml`) to AKS.

---

### Step 6: Verify Deployment in AKS

You can connect to your AKS cluster from your local terminal:

```bash
# 1. Download AKS credentials to your local kubeconfig
az aks get-credentials --resource-group rg-secadvisor-prod --name aks-secadvisor-cluster

# 2. Check namespace and pods
kubectl get namespaces
kubectl get pods -n sec-advisor -o wide

# Expected output:
# NAME                           READY   STATUS    RESTARTS   AGE
# sec-advisor-7d4986b68b-5x9jk   1/1     Running   0          2m
# sec-advisor-7d4986b68b-8m2pl   1/1     Running   0          2m

# 3. View live pod logs
kubectl logs -n sec-advisor -l app=sec-advisor -f

# 4. Quick Local Test via Port-Forwarding
kubectl port-forward -n sec-advisor svc/sec-advisor-svc 8080:80
# Open http://localhost:8080 in your browser
```

---

### Step 7: Expose to Public Internet

You have two simple options to expose the service to your users or team:

#### Option A: LoadBalancer (Simplest)
If you want an Azure Public IP directly assigned to the service, edit `k8s/service.yaml`:
```yaml
spec:
  type: LoadBalancer
  ports:
    - name: http
      port: 80
      targetPort: 3000
```
Then run:
```bash
kubectl apply -f k8s/service.yaml
kubectl get svc -n sec-advisor --watch
```
Azure will provision an external public IP address within 1-2 minutes.

#### Option B: NGINX Ingress Controller / Azure Application Gateway (Recommended for Production)
Install NGINX ingress controller:
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-basic \
  --create-namespace

# Point your custom DNS record to the Ingress controller external IP.
```

---

## 3. Summary of Files in this Repository

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage production container build (Vite React frontend + Node.js Express server + inventory data). |
| `.dockerignore` | Excludes unnecessary local files (`node_modules`, `dist`, `.git`) to minimize Docker build context and time. |
| `azure-pipelines.yml` | Azure DevOps CI/CD pipeline definition for building, pushing to ACR, and deploying to AKS. |
| `k8s/namespace.yaml` | Kubernetes namespace isolation (`sec-advisor`). |
| `k8s/deployment.yaml` | 2-replica RollingUpdate Deployment with liveness & readiness probes and resource limits. |
| `k8s/service.yaml` | Kubernetes Service routing traffic to port 3000. |
| `k8s/ingress.yaml` | Ingress configuration with reverse proxy timeout settings. |
