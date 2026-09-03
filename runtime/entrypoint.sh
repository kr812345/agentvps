#!/bin/bash
set -e

echo "=================================================="
echo "🤖 AgentVPS Container Runtime Starting..."
echo "=================================================="

# 1. Configure Git
if [ -n "$GIT_AUTHOR_NAME" ]; then
    git config --global user.name "$GIT_AUTHOR_NAME"
fi
if [ -n "$GIT_AUTHOR_EMAIL" ]; then
    git config --global user.email "$GIT_AUTHOR_EMAIL"
fi

# 2. Configure GitHub CLI
if [ -n "$GITHUB_TOKEN" ]; then
    echo "$GITHUB_TOKEN" | gh auth login --with-token 2>/dev/null || true
    echo "✔ GitHub CLI authenticated"
fi

# 3. Start Telegram Bridge if configured
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_ADMIN_CHAT_ID" ]; then
    echo "📱 Launching Telegram mobile gateway..."
    python3 /opt/agentvps/telegram_bridge.py &
    TELEGRAM_PID=$!
    echo "✔ Telegram bridge running (PID: $TELEGRAM_PID)"
fi

# 4. Start Web Terminal (ttyd) if enabled
if [ "$ENABLE_WEB_TERMINAL" = "true" ] && command -v ttyd >/dev/null 2>&1; then
    TTYD_PORT=${WEB_TERMINAL_PORT:-7681}
    echo "💻 Starting Web Terminal on port ${TTYD_PORT}..."
    ttyd -p "${TTYD_PORT}" -W tmux attach -t agent_session &
    TTYD_PID=$!
fi

# 5. Launch Agent inside persistent tmux session
AGENT_CMD="$@"
if [ -z "$AGENT_CMD" ]; then
    case "$AGENT_TYPE" in
        "antigravity-cli")
            AGENT_CMD="antigravity-cli"
            ;;
        "claude-code")
            AGENT_CMD="claude"
            ;;
        "aider")
            AGENT_CMD="aider --no-git-commit --yes"
            ;;
        *)
            AGENT_CMD="bash"
            ;;
    esac
fi

echo "🚀 Launching Agent: ${AGENT_CMD}"

# Create tmux session and run agent
tmux new-session -d -s agent_session "cd /workspace && ${AGENT_CMD} 2>&1 | tee /workspace/.agent.log"

echo "✔ Agent session initialized in tmux [agent_session]"
echo "📊 Monitoring session output..."

# Keep container running and stream logs to stdout
touch /workspace/.agent.log
exec tail -f /workspace/.agent.log
