import { AgentConfig, AgentType, ProvisionOptions } from '../types/index.js';

export interface AgentRecipe {
  type: AgentType;
  name: string;
  description: string;
  requiredEnvVars: string[];
  optionalEnvVars: string[];
  defaultCommand: string;
  defaultPort?: number;
}

export const SUPPORTED_RECIPES: Record<AgentType, AgentRecipe> = {
  'antigravity-cli': {
    type: 'antigravity-cli',
    name: 'Antigravity CLI (Google DeepMind / AGY)',
    description: 'Advanced autonomous agentic coding CLI with multi-model reasoning and skills support',
    requiredEnvVars: ['GEMINI_API_KEY'],
    optionalEnvVars: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GITHUB_TOKEN'],
    defaultCommand: 'antigravity-cli',
  },
  'claude-code': {
    type: 'claude-code',
    name: 'Claude Code (Anthropic)',
    description: 'Autonomous terminal agent designed by Anthropic for deep code refactoring and tool use',
    requiredEnvVars: ['ANTHROPIC_API_KEY'],
    optionalEnvVars: ['GITHUB_TOKEN'],
    defaultCommand: 'claude',
  },
  aider: {
    type: 'aider',
    name: 'Aider AI Pair Programmer',
    description: 'Terminal-based pair programming agent with seamless Git integration and multi-file editing',
    requiredEnvVars: ['OPENAI_API_KEY'],
    optionalEnvVars: ['ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'GITHUB_TOKEN'],
    defaultCommand: 'aider --no-git-commit --yes',
  },
  openhands: {
    type: 'openhands',
    name: 'OpenHands (All-Hands AI)',
    description: 'Open-source software development agent with full GUI, workspace sandbox, and multi-tool planning',
    requiredEnvVars: ['OPENAI_API_KEY'],
    optionalEnvVars: ['ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'GITHUB_TOKEN'],
    defaultCommand: 'python -m openhands.core.main',
    defaultPort: 3000,
  },
  custom: {
    type: 'custom',
    name: 'Custom Autonomous Agent / Runner',
    description: 'User-specified agent executable or custom background loop',
    requiredEnvVars: [],
    optionalEnvVars: [],
    defaultCommand: 'bash -c "while true; do sleep 3600; done"',
  },
};

export class RecipeEngine {
  public static getRecipe(type: AgentType): AgentRecipe {
    return SUPPORTED_RECIPES[type] || SUPPORTED_RECIPES.custom;
  }

  public static generateEnvFile(config: AgentConfig): string {
    const lines: string[] = [
      '# AgentVPS Managed Environment Variables',
      `AGENT_TYPE=${config.type}`,
      `WORKSPACE_DIR=${config.workspacePath || '/workspace'}`,
    ];

    if (config.envVars) {
      for (const [k, v] of Object.entries(config.envVars)) {
        if (v) {
          lines.push(`${k}=${v}`);
        }
      }
    }

    if (config.gitConfig) {
      if (config.gitConfig.name) lines.push(`GIT_AUTHOR_NAME="${config.gitConfig.name}"`);
      if (config.gitConfig.name) lines.push(`GIT_COMMITTER_NAME="${config.gitConfig.name}"`);
      if (config.gitConfig.email) lines.push(`GIT_AUTHOR_EMAIL="${config.gitConfig.email}"`);
      if (config.gitConfig.email) lines.push(`GIT_COMMITTER_EMAIL="${config.gitConfig.email}"`);
      if (config.gitConfig.githubToken) lines.push(`GITHUB_TOKEN="${config.gitConfig.githubToken}"`);
    }

    return lines.join('\n') + '\n';
  }

  public static generateDockerCompose(options: ProvisionOptions): string {
    const agent = options.agent;
    const memLimit = agent.memoryLimitMb ? `${agent.memoryLimitMb}m` : '3500m';
    const cpuLimit = agent.cpuLimit ? `${agent.cpuLimit}` : '2.0';
    const workspaceHostPath = '/opt/agentvps/workspace';
    const configHostPath = '/opt/agentvps/config';

    const ports: string[] = [];
    if (options.enableWebTerminal && options.webTerminalPort) {
      ports.push(`      - "127.0.0.1:${options.webTerminalPort}:7681"`);
    }

    const recipe = this.getRecipe(agent.type);
    if (recipe.defaultPort) {
      ports.push(`      - "127.0.0.1:${recipe.defaultPort}:${recipe.defaultPort}"`);
    }

    const command = agent.customCommand || recipe.defaultCommand;

    return `version: '3.8'

services:
  agent:
    image: agentvps-runtime:latest
    container_name: agentvps_active_agent
    restart: unless-stopped
    stdin_open: true
    tty: true
    env_file:
      - /opt/agentvps/.env
    volumes:
      - ${workspaceHostPath}:/workspace
      - ${configHostPath}:/root/.config
      - /var/run/docker.sock:/var/run/docker.sock
${ports.length > 0 ? '    ports:\n' + ports.join('\n') : ''}
    deploy:
      resources:
        limits:
          cpus: '${cpuLimit}'
          memory: ${memLimit}
    command: ${command}
`;
  }

  public static generateSystemdService(): string {
    return `[Unit]
Description=AgentVPS 24/7 Autonomous AI Agent Service
After=docker.service network-online.target
Requires=docker.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/agentvps
ExecStart=/usr/bin/docker compose -f /opt/agentvps/docker-compose.yml up --remove-orphans
ExecStop=/usr/bin/docker compose -f /opt/agentvps/docker-compose.yml down
Restart=always
RestartSec=10
TimeoutStartSec=180
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
`;
  }
}
