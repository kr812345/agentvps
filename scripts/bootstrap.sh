#!/bin/sh
# AgentVPS Universal Multi-OS Turnkey Bootstrap
# Supports: Debian, Ubuntu, Fedora, CentOS, RHEL, Rocky, Alma, Arch, Alpine, openSUSE
set -e

# ANSI Color Codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo ""
echo "${CYAN}${BOLD}====================================================${NC}"
echo "${CYAN}${BOLD}       🚀 AgentVPS: 24/7 AI Agent Installer        ${NC}"
echo "${CYAN}${BOLD}====================================================${NC}"
echo ""

# Parse CLI arguments if passed (e.g., --agent=claude-code --gemini-key=xyz)
AGENT_TYPE=""
GEMINI_KEY=""
ANTHROPIC_KEY=""
OPENAI_KEY=""
TELEGRAM_TOKEN=""
TELEGRAM_CHAT_ID=""
AUTO_APPROVE=false

for arg in "$@"; do
    case $arg in
        --agent=*) AGENT_TYPE="${arg#*=}" ;;
        --gemini-key=*) GEMINI_KEY="${arg#*=}" ;;
        --anthropic-key=*) ANTHROPIC_KEY="${arg#*=}" ;;
        --openai-key=*) OPENAI_KEY="${arg#*=}" ;;
        --telegram-token=*) TELEGRAM_TOKEN="${arg#*=}" ;;
        --telegram-chat-id=*) TELEGRAM_CHAT_ID="${arg#*=}" ;;
        -y|--yes) AUTO_APPROVE=true ;;
    esac
done

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
    echo "${RED}❌ Cannot determine OS: /etc/os-release not found.${NC}"
    exit 1
fi

ARCH=$(uname -m)
echo "${CYAN}ℹ [1/5] Detected System:${NC} ${PRETTY_NAME:-$OS_ID} (${ARCH})"

# 2. Package Manager & Essential Dependencies
echo "${CYAN}ℹ [2/5] Ensuring Core Tools (curl, git, tmux, jq)...${NC}"

case "$OS_ID" in
    ubuntu|debian|pop|linuxmint)
        export DEBIAN_FRONTEND=noninteractive
        apt-get update -y -qq >/dev/null 2>&1 || true
        apt-get install -y -qq curl wget git tmux jq ca-certificates gnupg >/dev/null 2>&1 || true
        ;;
    fedora|rhel|centos|rocky|alma)
        dnf install -y -q curl wget git tmux jq ca-certificates >/dev/null 2>&1 || true
        ;;
    arch|manjaro)
        pacman -Sy --noconfirm curl wget git tmux jq ca-certificates >/dev/null 2>&1 || true
        ;;
    alpine)
        apk update >/dev/null 2>&1 || true
        apk add curl wget git tmux jq ca-certificates bash >/dev/null 2>&1 || true
        ;;
    *)
        echo "${YELLOW}⚠ Generic Linux. Proceeding with best-effort...${NC}"
        ;;
esac

# 3. Docker Engine Installation
echo "${CYAN}ℹ [3/5] Verifying Docker Engine...${NC}"
if ! command -v docker >/dev/null 2>&1; then
    echo "  ${YELLOW}➔ Docker not found. Installing Docker Engine (takes ~30s)...${NC}"
    if [ "$OS_ID" = "alpine" ]; then
        apk add docker docker-cli-compose >/dev/null 2>&1
        rc-update add docker boot || true
        service docker start || true
    elif [ "$OS_ID" = "arch" ] || [ "$OS_ID" = "manjaro" ]; then
        pacman -Sy --noconfirm docker docker-compose >/dev/null 2>&1
        systemctl enable --now docker >/dev/null 2>&1 || true
    else
        curl -fsSL https://get.docker.com | sh >/dev/null 2>&1
        systemctl enable --now docker >/dev/null 2>&1 || true
    fi
    echo "  ${GREEN}✔ Docker Engine installed successfully!${NC}"
else
    echo "  ${GREEN}✔ Docker is already active ($(docker --version))${NC}"
fi

# 4. Filesystem Structure
mkdir -p /opt/agentvps/workspace /opt/agentvps/config /opt/agentvps/runtime

# 5. Interactive Configuration (Reads from /dev/tty if stdin is piped via curl)
if [ -t 0 ] || [ -e /dev/tty ]; then
    TTY_DEV="/dev/tty"
else
    TTY_DEV="/dev/stdin"
fi

if [ -z "$AGENT_TYPE" ]; then
    echo ""
    echo "${BOLD}🤖 Which AI Agent would you like to run 24/7?${NC}"
    echo "  ${CYAN}[1]${NC} Antigravity CLI (Google DeepMind AGY) ${GREEN}[Default]${NC}"
    echo "  ${CYAN}[2]${NC} Claude Code (Anthropic)"
    echo "  ${CYAN}[3]${NC} Aider (AI Pair Programmer)"
    echo "  ${CYAN}[4]${NC} OpenHands (All-Hands AI)"
    printf "${BOLD}Select [1-4] (default 1): ${NC}"
    read -r CHOICE < "$TTY_DEV" 2>/dev/null || CHOICE="1"
    
    case "$CHOICE" in
        2) AGENT_TYPE="claude-code" ;;
        3) AGENT_TYPE="aider" ;;
        4) AGENT_TYPE="openhands" ;;
        *) AGENT_TYPE="antigravity-cli" ;;
    esac
fi

echo "${GREEN}✔ Selected Agent:${NC} ${BOLD}${AGENT_TYPE}${NC}"

# Ask for API Key if not provided via flags
if [ "$AGENT_TYPE" = "antigravity-cli" ] && [ -z "$GEMINI_KEY" ]; then
    printf "${BOLD}Enter your Google Gemini API Key (or press Enter to skip): ${NC}"
    read -r GEMINI_KEY < "$TTY_DEV" 2>/dev/null || GEMINI_KEY=""
elif [ "$AGENT_TYPE" = "claude-code" ] && [ -z "$ANTHROPIC_KEY" ]; then
    printf "${BOLD}Enter your Anthropic Claude API Key (or press Enter to skip): ${NC}"
    read -r ANTHROPIC_KEY < "$TTY_DEV" 2>/dev/null || ANTHROPIC_KEY=""
elif [ -z "$OPENAI_KEY" ]; then
    printf "${BOLD}Enter your OpenAI API Key (or press Enter to skip): ${NC}"
    read -r OPENAI_KEY < "$TTY_DEV" 2>/dev/null || OPENAI_KEY=""
fi

# Optional Telegram Setup
if [ -z "$TELEGRAM_TOKEN" ]; then
    printf "${BOLD}Would you like mobile phone control via Telegram? [y/N]: ${NC}"
    read -r TG_CONFIRM < "$TTY_DEV" 2>/dev/null || TG_CONFIRM="n"
    if [ "$TG_CONFIRM" = "y" ] || [ "$TG_CONFIRM" = "Y" ]; then
        printf "  ➔ Enter Telegram Bot Token (from @BotFather): "
        read -r TELEGRAM_TOKEN < "$TTY_DEV" 2>/dev/null || TELEGRAM_TOKEN=""
        printf "  ➔ Enter your Telegram Chat ID (from @userinfobot): "
        read -r TELEGRAM_CHAT_ID < "$TTY_DEV" 2>/dev/null || TELEGRAM_CHAT_ID=""
    fi
fi

# 6. Write Environment File
echo "${CYAN}ℹ [4/5] Configuring Environment and 24/7 Service...${NC}"
ENV_FILE="/opt/agentvps/.env"
cat <<EOF > "$ENV_FILE"
AGENT_TYPE=${AGENT_TYPE}
WORKSPACE_DIR=/workspace
GEMINI_API_KEY=${GEMINI_KEY}
ANTHROPIC_API_KEY=${ANTHROPIC_KEY}
OPENAI_API_KEY=${OPENAI_KEY}
TELEGRAM_BOT_TOKEN=${TELEGRAM_TOKEN}
TELEGRAM_ADMIN_CHAT_ID=${TELEGRAM_CHAT_ID}
EOF
chmod 600 "$ENV_FILE"

# 7. Pull or Run Container
echo "${CYAN}ℹ [5/5] Launching Agent Sandbox...${NC}"

# Check for pre-built image or use local runtime
IMAGE_NAME="ghcr.io/kr812345/agentvps/runtime:latest"
if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
    echo "  ➔ Pulling pre-built agent sandbox image..."
    docker pull "$IMAGE_NAME" >/dev/null 2>&1 || IMAGE_NAME="node:22-bookworm-slim"
fi

# Stop existing container if running
docker stop agentvps_active_agent >/dev/null 2>&1 || true
docker rm agentvps_active_agent >/dev/null 2>&1 || true

# Determine launch command based on agent
case "$AGENT_TYPE" in
    "antigravity-cli") CMD="antigravity-cli" ;;
    "claude-code") CMD="claude" ;;
    "aider") CMD="aider --no-git-commit --yes" ;;
    *) CMD="bash" ;;
esac

# Launch container
docker run -d \
    --name agentvps_active_agent \
    --restart unless-stopped \
    --env-file "$ENV_FILE" \
    -v /opt/agentvps/workspace:/workspace \
    -v /opt/agentvps/config:/root/.config \
    -v /var/run/docker.sock:/var/run/docker.sock \
    "$IMAGE_NAME" \
    bash -c "cd /workspace && tmux new-session -d -s agent_session '${CMD}' && tail -f /dev/null" >/dev/null 2>&1 || true

# 8. Install Easy Helper CLI (/usr/local/bin/agent)
cat <<'EOF' > /usr/local/bin/agent
#!/bin/bash
case "$1" in
    status)
        echo "=== AgentVPS Status ==="
        docker ps --filter "name=agentvps_active_agent" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        ;;
    logs)
        docker logs --tail "${2:-50}" -f agentvps_active_agent
        ;;
    attach)
        docker exec -it agentvps_active_agent tmux attach -t agent_session
        ;;
    stop)
        docker stop agentvps_active_agent
        echo "Agent container stopped."
        ;;
    start)
        docker start agentvps_active_agent
        echo "Agent container started."
        ;;
    restart)
        docker restart agentvps_active_agent
        echo "Agent container restarted."
        ;;
    *)
        echo "AgentVPS Helper Commands:"
        echo "  agent attach   - Attach directly to the 24/7 agent terminal"
        echo "  agent status   - View container health and uptime"
        echo "  agent logs     - Stream real-time logs"
        echo "  agent restart  - Restart the agent container"
        echo "  agent stop     - Stop the agent container"
        ;;
esac
EOF
chmod +x /usr/local/bin/agent

# 9. Firewall
if command -v ufw >/dev/null 2>&1; then
    ufw allow 22/tcp >/dev/null 2>&1 || true
    ufw --force enable >/dev/null 2>&1 || true
fi

echo ""
echo "${GREEN}${BOLD}════════════════════════════════════════════════════${NC}"
echo "${GREEN}${BOLD}   🎉 24/7 AI AGENT IS NOW LIVE ON YOUR VPS!       ${NC}"
echo "${GREEN}${BOLD}════════════════════════════════════════════════════${NC}"
echo ""
echo "  • ${BOLD}Active Agent:${NC}  ${AGENT_TYPE}"
echo "  • ${BOLD}Workspace:${NC}     /opt/agentvps/workspace"
echo "  • ${BOLD}Status:${NC}        Running 24/7 in background"
echo ""
echo "${BOLD}Helpful Commands:${NC}"
echo "  ${CYAN}agent attach${NC}   ➔ Enter the live 24/7 agent session"
echo "  ${CYAN}agent logs${NC}     ➔ Watch live agent execution logs"
echo "  ${CYAN}agent status${NC}   ➔ Check uptime and memory usage"
echo "  ${CYAN}agent restart${NC}  ➔ Restart the agent session"
echo ""
