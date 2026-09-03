import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { detectVpsSchema, handleDetectVps } from './tools/detect.js';
import { provisionVpsSchema, handleProvisionVps } from './tools/provision.js';
import { deployAgentSchema, handleDeployAgent } from './tools/deploy.js';
import { checkAgentStatusSchema, handleCheckAgentStatus } from './tools/status.js';
import { executeAgentTaskSchema, handleExecuteAgentTask } from './tools/task.js';
import { setupTelegramSchema, handleSetupTelegram } from './tools/telegram.js';
import { generateBootstrapCurlSchema, handleGenerateBootstrapCurl } from './tools/curl.js';
import { createCloudVpsSchema, handleCreateCloudVps } from './tools/cloud.js';
import { registerMcpResourcesAndPrompts } from './resources.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'agentvps-mcp-server',
    version: '1.0.0',
  });

  // Tool 1: detect_vps
  server.tool(
    'detect_vps',
    'Inspects a remote VPS via SSH, auto-detects the Linux distro (Ubuntu/Debian/Fedora/Rocky/Arch/Alpine), hardware resources (RAM, CPU, Disk), and Docker status',
    detectVpsSchema,
    handleDetectVps
  );

  // Tool 2: provision_vps
  server.tool(
    'provision_vps',
    'Executes automated 1-click provisioning of a 24/7 autonomous AI agent (antigravity-cli, claude-code, aider, openhands) on any VPS. Hardens firewall, installs Docker, builds sandbox, sets up systemd service, and optionally connects mobile Telegram bot.',
    provisionVpsSchema,
    handleProvisionVps
  );

  // Tool 3: deploy_agent (switch agent)
  server.tool(
    'deploy_agent',
    'Switches or updates the active 24/7 AI agent on the remote VPS (e.g. switch from Antigravity to Claude Code or Aider) without reprovisioning the host OS',
    deployAgentSchema,
    handleDeployAgent
  );

  // Tool 4: check_agent_status
  server.tool(
    'check_agent_status',
    'Checks the live health, running processes, CPU/RAM resource usage, and recent logs of the 24/7 remote AI agent',
    checkAgentStatusSchema,
    handleCheckAgentStatus
  );

  // Tool 5: execute_agent_task
  server.tool(
    'execute_agent_task',
    'Dispatches a coding prompt or autonomous task directly into the 24/7 running agent session on the remote VPS',
    executeAgentTaskSchema,
    handleExecuteAgentTask
  );

  // Tool 6: setup_telegram_bridge
  server.tool(
    'setup_telegram_bridge',
    'Connects a Telegram bot to the remote agent so non-dev users can prompt, inspect diffs, and approve code changes directly from their mobile phone',
    setupTelegramSchema,
    handleSetupTelegram
  );

  // Tool 7: generate_bootstrap_curl
  server.tool(
    'generate_bootstrap_curl',
    'Generates a single-line copy-paste curl command for terminal users to provision their VPS without entering SSH credentials into tools',
    generateBootstrapCurlSchema,
    handleGenerateBootstrapCurl
  );

  // Tool 8: create_cloud_vps
  server.tool(
    'create_cloud_vps',
    'Spawns a brand new cloud VPS on Hetzner (€3.79/mo) or DigitalOcean ($12/mo) via Cloud API and self-provisions the 24/7 AI agent in 1-click without manual SSH',
    createCloudVpsSchema,
    handleCreateCloudVps
  );

  // Resources & Prompts
  registerMcpResourcesAndPrompts(server);

  return server;
}

export async function runMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 AgentVPS MCP Server running on stdio');
}
