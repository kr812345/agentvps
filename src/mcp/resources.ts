import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SUPPORTED_RECIPES } from '../engine/recipes.js';

export function registerMcpResourcesAndPrompts(server: McpServer) {
  // Resource 1: Supported Distros
  server.resource(
    'supported-distros',
    'agentvps://distros/supported',
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(
            {
              title: 'AgentVPS Supported Distributions & Hardware Architectures',
              architectures: ['x86_64 / amd64', 'aarch64 / arm64'],
              supportedDistributions: [
                { id: 'ubuntu', name: 'Ubuntu 20.04, 22.04, 24.04 LTS', packageManager: 'apt' },
                { id: 'debian', name: 'Debian 11 (Bullseye), 12 (Bookworm)', packageManager: 'apt' },
                { id: 'fedora', name: 'Fedora 38, 39, 40', packageManager: 'dnf' },
                { id: 'rocky', name: 'Rocky Linux 8, 9', packageManager: 'dnf' },
                { id: 'alma', name: 'AlmaLinux 8, 9', packageManager: 'dnf' },
                { id: 'centos', name: 'CentOS Stream 9', packageManager: 'dnf' },
                { id: 'arch', name: 'Arch Linux (rolling)', packageManager: 'pacman' },
                { id: 'alpine', name: 'Alpine Linux 3.18+', packageManager: 'apk' },
              ],
              minimumHardware: {
                ram: '1.5 GB (2 GB+ recommended)',
                disk: '10 GB SSD/NVMe',
                cpu: '1 vCPU (2+ vCPUs recommended)',
              },
            },
            null,
            2
          ),
        },
      ],
    })
  );

  // Resource 2: Supported Agent Recipes
  server.resource(
    'supported-recipes',
    'agentvps://recipes/supported',
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(
            {
              title: 'AgentVPS Supported AI Agent Frameworks',
              recipes: Object.values(SUPPORTED_RECIPES).map((r) => ({
                id: r.type,
                name: r.name,
                description: r.description,
                requiredSecrets: r.requiredEnvVars,
                optionalSecrets: r.optionalEnvVars,
                defaultCommand: r.defaultCommand,
              })),
            },
            null,
            2
          ),
        },
      ],
    })
  );

  // Prompt 1: Setup 24/7 Agent Workflow
  server.prompt(
    'setup_24_7_agent',
    'Interactive step-by-step workflow to turn a raw VPS into a 24/7 autonomous AI assistant',
    async () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `I want to set up an autonomous 24/7 AI agent on my VPS.
Please follow these steps:
1. Ask for my VPS IP address and SSH credentials (password or private key).
2. Use the 'detect_vps' tool to inspect the operating system, memory, and architecture.
3. Recommend the optimal agent (e.g. 'antigravity-cli' or 'claude-code') and ask for my API keys.
4. Optionally ask if I'd like mobile control via Telegram bot.
5. Call 'provision_vps' to execute the automated setup end-to-end.
6. Provide me with the confirmation, status report, and next steps!`,
          },
        },
      ],
    })
  );
}
