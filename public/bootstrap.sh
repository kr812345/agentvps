#!/bin/sh
# AgentVPS Universal Multi-OS Bootstrap Script
# Supports: Debian, Ubuntu, Fedora, CentOS, RHEL, Rocky, Alma, Arch, Alpine, openSUSE
set -e

echo "=================================================="
echo "🚀 AgentVPS: Initializing Universal System Bootstrap"
echo "=================================================="

# 1. Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID=$ID
    OS_LIKE=${ID_LIKE:-""}
elif [ -f /usr/lib/os-release ]; then
    . /usr/lib/os-release
    OS_ID=$ID
    OS_LIKE=${ID_LIKE:-""}
else
    echo "❌ Cannot determine OS: /etc/os-release not found."
    exit 1
fi

ARCH=$(uname -m)
echo "ℹ Detected OS: ${PRETTY_NAME:-$OS_ID} (${ARCH})"

# 2. Package Manager & Essential Dependencies
echo "ℹ Installing core dependencies (curl, git, tmux, ca-certificates)..."

case "$OS_ID" in
    ubuntu|debian|pop|linuxmint)
        export DEBIAN_FRONTEND=noninteractive
        apt-get update -y
        apt-get install -y curl wget git tmux jq ca-certificates gnupg
        ;;
    fedora|rhel|centos|rocky|alma)
        dnf install -y curl wget git tmux jq ca-certificates
        ;;
    arch|manjaro)
        pacman -Sy --noconfirm curl wget git tmux jq ca-certificates
        ;;
    alpine)
        apk update
        apk add curl wget git tmux jq ca-certificates bash
        ;;
    opensuse*|sles)
        zypper refresh
        zypper install -y curl wget git tmux jq ca-certificates
        ;;
    *)
        if echo "$OS_LIKE" | grep -q "debian"; then
            apt-get update -y && apt-get install -y curl wget git tmux jq ca-certificates
        elif echo "$OS_LIKE" | grep -q "rhel\|fedora"; then
            dnf install -y curl wget git tmux jq ca-certificates || yum install -y curl wget git tmux jq ca-certificates
        else
            echo "⚠ Unrecognized distribution ($OS_ID). Attempting best-effort install..."
        fi
        ;;
esac

# 3. Docker Installation (Idempotent)
if ! command -v docker >/dev/null 2>&1; then
    echo "ℹ Docker not detected. Installing Docker Engine..."
    if [ "$OS_ID" = "alpine" ]; then
        apk add docker docker-cli-compose
        rc-update add docker boot || true
        service docker start || true
    elif [ "$OS_ID" = "arch" ] || [ "$OS_ID" = "manjaro" ]; then
        pacman -Sy --noconfirm docker docker-compose
        systemctl enable --now docker || true
    else
        # Official cross-platform Docker convenience script
        curl -fsSL https://get.docker.com | sh
        systemctl enable --now docker || true
    fi
else
    echo "✔ Docker is already installed: $(docker --version)"
fi

# Ensure docker-compose is available (v2 plugin or standalone)
if ! docker compose version >/dev/null 2>&1; then
    echo "ℹ Ensuring docker compose v2 plugin..."
    case "$OS_ID" in
        ubuntu|debian)
            apt-get install -y docker-compose-plugin || true
            ;;
        fedora|rhel|rocky|alma)
            dnf install -y docker-compose-plugin || true
            ;;
    esac
fi

# 4. Create AgentVPS Directories
echo "ℹ Creating AgentVPS filesystem layout..."
mkdir -p /opt/agentvps/workspace
mkdir -p /opt/agentvps/config
mkdir -p /opt/agentvps/runtime

# 5. Firewall Hardening (Allow SSH, deny unneeded incoming)
if command -v ufw >/dev/null 2>&1; then
    echo "ℹ Configuring UFW firewall..."
    ufw allow 22/tcp || true
    # We do not open arbitrary ports to keep the VPS safe!
    ufw --force enable || true
elif command -v firewall-cmd >/dev/null 2>&1; then
    echo "ℹ Configuring firewalld..."
    firewall-cmd --permanent --add-service=ssh || true
    firewall-cmd --reload || true
fi

echo "✔ Universal System Bootstrap Completed Successfully!"
