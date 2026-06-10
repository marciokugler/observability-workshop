---
title: 1. Install Required Laptop Tools
weight: 1
---

Students can run this workshop on macOS, Windows, or Linux. Every local deployment needs a container engine, Kubernetes CLI access, Helm, Git, and one local Kubernetes runtime.

The tools below are used to deploy a small instrumented checkout application into Kubernetes. The app sends traces, service metadata, pod logs, and Kubernetes infrastructure telemetry to Splunk Observability Cloud so the AI troubleshooting agent has real evidence to analyze after an issue is injected.

## 1. Get the Workshop Files

Start by downloading this repository to the laptop or VM where you will run the lab.

Clone with Git:

```bash
git clone https://github.com/splunk/observability-workshop.git
cd observability-workshop
```

If Git is not installed yet, download the repository ZIP with `curl`:

```bash
curl -L https://github.com/splunk/observability-workshop/archive/refs/heads/main.zip -o observability-workshop.zip
unzip observability-workshop.zip
cd observability-workshop-main
```

Or download with `wget`:

```bash
wget -O observability-workshop.zip https://github.com/splunk/observability-workshop/archive/refs/heads/main.zip
unzip observability-workshop.zip
cd observability-workshop-main
```

{{% notice title="Workshop Branch" style="info" %}}
If your instructor provides a fork or branch URL, use that URL instead of `https://github.com/splunk/observability-workshop.git`.
{{% /notice %}}

## 2. Install Required Software

| Tool | Why it is needed |
|------|------------------|
| Git | Clone or update the workshop repository. |
| Docker | Build the lab application image locally. |
| `kubectl` | Deploy and inspect Kubernetes resources. |
| Helm | Install the Splunk OpenTelemetry Collector chart. |
| Local Kubernetes runtime | Run the lab app on the student's laptop. Choose `kind`, Minikube, or MicroK8s. |
| Splunk Observability Cloud access token | Send telemetry from the collector to Splunk Observability Cloud. |

{{% notice title="Exercise" style="green" icon="running" %}}

Choose the instructions for your operating system and run the install command before checking versions.

## macOS

The helper script uses Homebrew to install Git, `kubectl`, Helm, `kind`, and Minikube. If Docker Desktop is not installed, it installs Docker Desktop as a cask.

```bash
cd workshop/ai-troubleshooting-remediation
./scripts/install-tools-macos.sh
```

After the script completes:

* Start **Docker Desktop** from Applications if it was newly installed.
* Wait until Docker reports that it is running.
* Open a new terminal window.
* Verify the tools:

```bash
git --version
docker version
kubectl version --client
helm version
kind version
minikube version
```

## Windows

Use Windows PowerShell for the native Windows path. The helper script uses `winget` to install Git, Docker Desktop, `kubectl`, Helm, `kind`, and Minikube.

```powershell
cd workshop\ai-troubleshooting-remediation
.\scripts\install-tools-windows.ps1
```

After the script completes:

* Start **Docker Desktop**.
* Enable the WSL2 backend in Docker Desktop if prompted.
* Open a new PowerShell window.
* Verify the tools:

```powershell
git --version
docker version
kubectl version --client
helm version
kind version
minikube version
```

If you prefer to run the workshop inside Ubuntu on WSL2, install WSL first:

```powershell
.\scripts\install-tools-windows.ps1 -IncludeWsl
```

Then open Ubuntu and follow the Linux instructions below.

## Linux

The Linux helper supports Debian and Ubuntu systems with `apt-get`. Set `LOCAL_RUNTIME` to the runtime you want to use.

If `curl`, `wget`, `unzip`, or Git are missing on a fresh VM, install the bootstrap tools first:

```bash
sudo apt update
sudo apt install -y curl wget unzip git
```

For `kind`:

```bash
cd workshop/ai-troubleshooting-remediation
LOCAL_RUNTIME=kind ./scripts/install-tools-linux.sh
```

For Minikube:

```bash
cd workshop/ai-troubleshooting-remediation
LOCAL_RUNTIME=minikube ./scripts/install-tools-linux.sh
```

For MicroK8s:

```bash
cd workshop/ai-troubleshooting-remediation
LOCAL_RUNTIME=microk8s ./scripts/install-tools-linux.sh
```

After the script completes:

* Log out and back in if Docker or MicroK8s group membership was changed.
* Verify the tools for your selected runtime:

```bash
git --version
docker version
kubectl version --client
helm version
kind version
minikube version
microk8s status --wait-ready
```

Only the runtime you selected needs to pass its version or status check.

{{< tabs >}}
{{% tab title="Question" %}}
**Which local runtime should a student choose if they are unsure?**
{{% /tab %}}
{{% tab title="Answer" %}}
**Choose `kind` for the most repeatable workshop experience. Choose Minikube if the student already uses it. Choose MicroK8s for Linux laptops or VMs where Canonical MicroK8s is already standard.**
{{% /tab %}}
{{< /tabs >}}

{{% /notice %}}

{{% notice title="Access Token" style="info" %}}
The install scripts do not create Splunk Observability Cloud tokens. Before deploying the lab app, create or obtain an access token and keep it available as `SPLUNK_ACCESS_TOKEN`.
{{% /notice %}}
