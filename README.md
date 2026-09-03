# 🚀 AgentVPS: 24/7 Autonomous AI Agent VPS Provisioner & MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Standard-purple.svg)](https://modelcontextprotocol.io/)
[![Multi-OS](https://img.shields.io/badge/OS-Ubuntu%20%7C%20Debian%20%7C%20Fedora%20%7C%20Rocky%20%7C%20Arch%20%7C%20Alpine-green.svg)](#supported-linux-distributions)
[![Multi-Agent](https://img.shields.io/badge/Agents-Antigravity%20%7C%20Claude%20Code%20%7C%20Aider%20%7C%20OpenHands-orange.svg)](#supported-ai-agents)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Turn any raw, cheap VPS ($4/month Hetzner, DigitalOcean, OVH, AWS) into an always-on, 24/7 autonomous AI software engineer with 1 click.**
> Includes an official **Model Context Protocol (MCP)** server so AI agents (Claude Desktop, Cursor, Antigravity) can inspect, provision, and control remote servers on your behalf.

---

## 💡 Why AgentVPS?

| Local Laptop Agents | Hosted Sandboxes (Devin, etc.) | **AgentVPS (BYO-VPS)** |
| :--- | :--- | :--- |
| ❌ Sleep/lid close terminates agents | ❌ Expensive ($20–$500/month) |  **$4–$10/month unmetered 24/7 compute** |
| ❌ Battery drain, loud fans, heat | ❌ Strict token and runtime limits |  **100% private data sovereignty** |
| ❌ Wi-Fi dropouts break long tasks | ❌ Closed, vendor-locked sandbox |  **Full persistent workspace + Git sync** |
| ❌ Cannot control when away from desk | ❌ Cannot run custom daemons/cron |  **Telegram mobile gateway: control from phone** |

---

## 🏗 System Architecture

```mermaid
flowchart TD
    subgraph Clients ["AI Clients & User Touchpoints"]
        MCP["AI Assistant via MCP\n(Claude Desktop / Cursor / Antigravity)"]
        CLI["Human Dev via CLI\n(npx agentvps setup)"]
        Phone["Mobile via Telegram Bot\n(/run, /diff, /status)"]
    end

    subgraph CoreEngine ["AgentVPS Engine (Local / MCP)"]
        SSH["Direct SSH Engine (ssh2)"]
        OSD["Dynamic OS Detector\n(Ubuntu, Debian, Fedora, Arch, Alpine)"]
        Recipe["Modular Agent Recipe Engine"]
    end

    subgraph TargetVPS ["User's Remote VPS (Any Cloud Provider)"]
        subgraph HostOS ["Host Security & Persistence"]
            Docker["Docker Engine (Isolated Container)"]
            Systemd["systemd (agentvps.service Watchdog)"]
            Firewall["UFW / Firewalld (Zero Open Inbound Ports)"]
        end
        subgraph AgentSandbox ["Universal Multi-Arch Container"]
            Runtime["Node 22 + Python 3.12 (uv) + Git + tmux"]
            ActiveAgent["Active Agent: Antigravity / Claude Code / Aider"]
            TelegramDaemon["Telegram Long-Polling Gateway"]
            Workspace["Persistent /workspace Volume"]
        end
    end

    MCP --> CoreEngine
    CLI --> CoreEngine
    CoreEngine -->|1. Direct SSH Provisioning| HostOS
    HostOS --> Docker
    Docker --> AgentSandbox
    Phone <-->|2. Outbound HTTPS Polling (No Ports Needed)| TelegramDaemon
```

---

## ⚡ Quickstart

### 1. Using with AI Assistants via MCP (Claude Desktop, Cursor, Antigravity)

Add AgentVPS to your MCP client configuration:

#### Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):
```json
{
  "mcpServers": {
    "agentvps": {
      "command": "npx",
      "args": ["-y", "agentvps", "mcp"]
    }
  }
}
```

#### Cursor (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "agentvps": {
      "command": "npx",
      "args": ["-y", "agentvps", "mcp"]
    }
  }
}
```

Now, simply instruct your AI assistant:
> *"I have a VPS at 159.65.120.45 with root password 'myPass'. Inspect the server and set up Antigravity CLI to run 24/7."*

Your AI will autonomously call `detect_vps` and `provision_vps`!

---

### 2. Using via Standalone CLI

You can also run AgentVPS directly from your terminal without installing anything:

```bash
# 1. Inspect remote VPS specs and readiness
npx agentvps detect -h 159.65.120.45 -P "your_root_password"

# 2. Provision 24/7 Antigravity agent with Telegram mobile control
npx agentvps setup \
  -h 159.65.120.45 \
  -P "your_root_password" \
  -a antigravity-cli \
  --gemini-key "AIzaSy..." \
  --telegram-token "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" \
  --telegram-chat-id "987654321"

# 3. Check live status and logs of your remote agent
npx agentvps status -h 159.65.120.45 -P "your_root_password"
```

---

### 3. One-Line Curl Bootstrap (Manual Server Terminal)

If you prefer logging into your VPS directly and running a single command:

```bash
curl -fsSL https://get.agentvps.dev/bootstrap.sh | bash -s -- --agent=antigravity-cli
```

---

## 📱 Telegram Mobile Gateway (The Killer Feature)

When enabled, AgentVPS launches a zero-dependency polling daemon on your VPS. You can control your 24/7 coding agent directly from your phone while on the subway or away from your computer!

```
Mobile Commands:
• /status      - Live CPU, RAM, and agent process health
• /run <task>  - Dispatch a prompt or task to the agent
• /diff        - View Git changes made by the agent
• /logs        - View the last 25 lines of execution logs
• /stop        - Send interrupt (Ctrl+C) to agent
```

> **Security Note**: The Telegram bridge uses **outbound long-polling**. It does NOT open any ports or require public webhooks. Only messages from your configured `TELEGRAM_ADMIN_CHAT_ID` are processed; all unauthorized messages are rejected.

---

## 🐧 Supported Linux Distributions & Architectures

AgentVPS is thoroughly tested on both **x86_64** (Intel/AMD) and **aarch64** (ARM64, e.g. Hetzner CAX, AWS Graviton, Oracle Free Tier):

| Distribution | Supported Versions | Package Manager |
| :--- | :--- | :--- |
| **Ubuntu** | 20.04, 22.04, 24.04 LTS | `apt` |
| **Debian** | 11 (Bullseye), 12 (Bookworm) | `apt` |
| **Fedora** | 38, 39, 40+ | `dnf` |
| **Rocky Linux & AlmaLinux** | 8, 9 | `dnf` |
| **CentOS Stream** | 9 | `dnf` |
| **Arch Linux & Manjaro** | Rolling release | `pacman` |
| **Alpine Linux** | 3.18, 3.19+ | `apk` |

---

## 🤖 Supported AI Agents

| Agent | Description | Required Secrets |
| :--- | :--- | :--- |
| **Antigravity CLI** | Autonomous agentic coding CLI by Google DeepMind AGY team | `GEMINI_API_KEY` |
| **Claude Code** | Terminal-based coding agent by Anthropic | `ANTHROPIC_API_KEY` |
| **Aider** | Git-integrated AI pair programmer | `OPENAI_API_KEY` (or Anthropic/Gemini) |
| **OpenHands** | Autonomous software dev platform (All-Hands AI) | `OPENAI_API_KEY` |
| **Custom** | Any custom background agent loop or runner script | User-defined |

You can switch agents at any time without reprovisioning the server using the `deploy_agent` MCP tool or:
```bash
npx agentvps switch -h <host> -a claude-code
```

---

## 🛡 Security Architecture

1. **Zero Public Inbound Ports**: The agent container communicates with Telegram via outbound HTTPS. The firewall blocks all incoming ports other than SSH.
2. **Local Zero-Knowledge Execution**: Credentials entered into the MCP tool or CLI stay on your computer and connect directly to your VPS. No passwords or API keys ever touch any intermediary cloud servers.
3. **Container Sandboxing**: All agents run inside an isolated Docker container with strict CPU and RAM limits (`--memory=3500m --cpus=2.0`). A runaway agent script cannot freeze or corrupt your host OS.
4. **Persistent Watchdog**: Managed by native `systemd` (`agentvps.service`). Automatically restarts on crash, OOM, or VPS reboot.

---

## 🧪 Testing & Development

Run the automated test suite:

```bash
# Install dependencies
npm install

# Run unit and integration tests (Vitest)
npm run test

# Compile TypeScript
npm run build

# Start MCP server directly on stdio
npm run mcp
```

---

## 📄 License

MIT License. Built for the autonomous agentic coding community.
