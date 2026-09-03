FROM node:22-bookworm-slim

LABEL maintainer="AgentVPS Team"
LABEL description="Universal Multi-Agent Runtime Sandbox (Antigravity, Claude Code, Aider, OpenHands)"

# 1. Install system utilities, Python 3, Git, tmux, ripgrep, jq
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    git \
    tmux \
    ripgrep \
    jq \
    ca-certificates \
    procps \
    openssh-client \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 2. Install uv (ultra-fast python package manager)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# 3. Install GitHub CLI (gh)
RUN mkdir -p -m 755 /etc/apt/keyrings && \
    wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null && \
    chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages/ stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && apt-get install -y gh && \
    rm -rf /var/lib/apt/lists/*

# 4. Install Agent Toolchains
# Aider via uv
RUN uv tool install aider-chat

# Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code || true

# 5. Install ttyd (web terminal)
ARG TARGETARCH
RUN ARCH_TTYD=${TARGETARCH:-amd64} && \
    if [ "$ARCH_TTYD" = "arm64" ]; then ARCH_TTYD="aarch64"; else ARCH_TTYD="x86_64"; fi && \
    wget -qO /usr/local/bin/ttyd https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.${ARCH_TTYD} || \
    wget -qO /usr/local/bin/ttyd https://github.com/tsl0922/ttyd/releases/download/1.7.4/ttyd.${ARCH_TTYD} || true && \
    chmod +x /usr/local/bin/ttyd || true

# 6. Setup Workspace & User
ENV PATH="/root/.local/bin:${PATH}"
WORKDIR /workspace

COPY entrypoint.sh /entrypoint.sh
COPY telegram_bridge.py /opt/agentvps/telegram_bridge.py
RUN chmod +x /entrypoint.sh /opt/agentvps/telegram_bridge.py

EXPOSE 7681

ENTRYPOINT ["/entrypoint.sh"]
