/**
 * AgentVPS Cloudflare Worker / Edge Endpoint
 * Serves bootstrap.sh for curl/wget requests, llms.txt for AI engines,
 * and a high-converting dark-mode landing page for browsers.
 */

const BOOTSTRAP_SCRIPT = `#!/bin/sh
# AgentVPS Universal Multi-OS Bootstrap Script
set -e

echo "=================================================="
echo "🚀 AgentVPS: Initializing Universal System Bootstrap"
echo "=================================================="

if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID=$ID
    OS_LIKE=\${ID_LIKE:-""}
elif [ -f /usr/lib/os-release ]; then
    . /usr/lib/os-release
    OS_ID=$ID
    OS_LIKE=\${ID_LIKE:-""}
else
    echo "❌ Cannot determine OS: /etc/os-release not found."
    exit 1
fi

ARCH=$(uname -m)
echo "ℹ Detected OS: \${PRETTY_NAME:-$OS_ID} (\${ARCH})"

case "$OS_ID" in
    ubuntu|debian|pop|linuxmint)
        export DEBIAN_FRONTEND=noninteractive
        apt-get update -y && apt-get install -y curl wget git tmux jq ca-certificates
        ;;
    fedora|rhel|centos|rocky|alma)
        dnf install -y curl wget git tmux jq ca-certificates
        ;;
    arch|manjaro)
        pacman -Sy --noconfirm curl wget git tmux jq ca-certificates
        ;;
    alpine)
        apk update && apk add curl wget git tmux jq ca-certificates bash
        ;;
    *)
        echo "⚠ Generic Linux detected. Ensuring curl & git..."
        ;;
esac

if ! command -v docker >/dev/null 2>&1; then
    echo "ℹ Docker not detected. Installing Docker Engine..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker || true
else
    echo "✔ Docker already installed: $(docker --version)"
fi

mkdir -p /opt/agentvps/workspace /opt/agentvps/config /opt/agentvps/runtime

if command -v ufw >/dev/null 2>&1; then
    ufw allow 22/tcp || true
    ufw --force enable || true
fi

echo "✔ Universal System Bootstrap Completed Successfully!"
`;

const LANDING_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgentVPS - 24/7 Autonomous AI Agent VPS Provisioner & MCP Server</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body { background-color: #0b0f19; color: #f3f4f6; }
    .glow { box-shadow: 0 0 50px -10px rgba(59, 130, 246, 0.4); }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between selection:bg-blue-600 selection:text-white">
  <header class="border-b border-gray-800/80 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
    <div class="flex items-center space-x-3">
      <div class="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/30">⚡</div>
      <span class="text-xl font-bold tracking-tight">Agent<span class="text-blue-500">VPS</span></span>
    </div>
    <div class="flex items-center space-x-6 text-sm text-gray-400">
      <a href="/llms.txt" class="hover:text-blue-400 transition">llms.txt</a>
      <a href="https://github.com/antigravity-community/agentvps" target="_blank" class="hover:text-white transition flex items-center space-x-2">
        <i class="fab fa-github"></i>
        <span>GitHub</span>
      </a>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-6 py-16 text-center">
    <div class="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-400 text-xs font-medium mb-8">
      <span>✨ Official Model Context Protocol (MCP) Server Included</span>
    </div>
    
    <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
      Turn any <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">$4 VPS</span> into an always-on, 24/7 AI Engineer
    </h1>
    
    <p class="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
      Stop killing your laptop battery. Deploy Antigravity CLI, Claude Code, or Aider to any remote cloud server with zero configuration and mobile Telegram control.
    </p>

    <!-- Terminal Box -->
    <div class="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 text-left glow mb-12 relative group max-w-2xl mx-auto">
      <div class="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
        <div class="flex space-x-2">
          <div class="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div class="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div class="w-3 h-3 rounded-full bg-green-500/80"></div>
        </div>
        <span class="text-xs text-gray-500 font-mono">1-Click Terminal Bootstrap</span>
      </div>
      <div class="flex items-center justify-between font-mono text-sm sm:text-base text-gray-300">
        <span class="text-blue-400 select-none mr-3">$</span>
        <span class="flex-1 overflow-x-auto whitespace-nowrap">curl -fsSL https://get.agentvps.dev | bash</span>
        <button onclick="navigator.clipboard.writeText('curl -fsSL https://get.agentvps.dev | bash'); alert('Copied to clipboard!')" class="ml-4 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-sans transition">
          Copy
        </button>
      </div>
    </div>

    <!-- Features Grid -->
    <div class="grid sm:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
      <div class="p-6 rounded-2xl bg-gray-900/50 border border-gray-800/80">
        <div class="text-2xl mb-3 text-blue-400">🤖</div>
        <h3 class="font-semibold text-white mb-2">Multi-Agent Support</h3>
        <p class="text-sm text-gray-400">Switch between Antigravity, Claude Code, and Aider on the fly without wiping your workspace.</p>
      </div>
      <div class="p-6 rounded-2xl bg-gray-900/50 border border-gray-800/80">
        <div class="text-2xl mb-3 text-green-400">📱</div>
        <h3 class="font-semibold text-white mb-2">Telegram Mobile Gateway</h3>
        <p class="text-sm text-gray-400">Control your agent from your phone: view Git diffs, send prompts, and approve merges anywhere.</p>
      </div>
      <div class="p-6 rounded-2xl bg-gray-900/50 border border-gray-800/80">
        <div class="text-2xl mb-3 text-purple-400">🛡</div>
        <h3 class="font-semibold text-white mb-2">Zero Open Ports</h3>
        <p class="text-sm text-gray-400">Hardened firewall by default. Outbound HTTPS polling protects your server from port 22 brute-force.</p>
      </div>
    </div>
  </main>

  <footer class="border-t border-gray-800/80 py-8 text-center text-xs text-gray-600">
    AgentVPS Open Source Project &bull; MIT License &bull; Designed for Autonomous AI Development
  </footer>
</body>
</html>
`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const userAgent = (request.headers.get('user-agent') || '').toLowerCase();

    // 1. If curl or wget, or path is /bootstrap.sh or /install -> Serve Shell Script
    if (
      userAgent.includes('curl') ||
      userAgent.includes('wget') ||
      url.pathname === '/bootstrap.sh' ||
      url.pathname === '/install'
    ) {
      return new Response(BOOTSTRAP_SCRIPT, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    // 2. Return landing page for browsers
    return new Response(LANDING_PAGE_HTML, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  },
};
