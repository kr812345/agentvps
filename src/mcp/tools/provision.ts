import { z } from 'zod';
import { ProvisionOrchestrator } from '../../engine/orchestrator.js';
import { ProvisionOptions, AgentType } from '../../types/index.js';

export const provisionVpsSchema = {
  host: z.string().describe('IP address or hostname of the remote VPS'),
  port: z.number().optional().default(22).describe('SSH port (default: 22)'),
  username: z.string().optional().default('root').describe('SSH username (default: root)'),
  password: z.string().optional().describe('SSH password'),
  privateKey: z.string().optional().describe('SSH private key'),
  passphrase: z.string().optional().describe('Passphrase if private key is encrypted'),
  agentType: z
    .enum(['antigravity-cli', 'claude-code', 'aider', 'openhands', 'custom'])
    .default('antigravity-cli')
    .describe('AI agent to install and orchestrate 24/7'),
  geminiApiKey: z.string().optional().describe('Google Gemini API Key (recommended for Antigravity)'),
  anthropicApiKey: z.string().optional().describe('Anthropic Claude API Key (required for Claude Code)'),
  openaiApiKey: z.string().optional().describe('OpenAI API Key (used for Aider / OpenHands)'),
  githubToken: z.string().optional().describe('GitHub Personal Access Token for git cloning and push'),
  gitUserName: z.string().optional().describe('Git author user name'),
  gitUserEmail: z.string().optional().describe('Git author email address'),
  telegramBotToken: z.string().optional().describe('Telegram Bot Token for 24/7 mobile control'),
  telegramAdminChatId: z.string().optional().describe('Your Telegram numeric Chat ID for authorization'),
  enableWebTerminal: z.boolean().optional().default(false).describe('Enable web-based PTY terminal (default: false for security)'),
  webTerminalPort: z.number().optional().default(7681).describe('Port for web terminal if enabled'),
  customCommand: z.string().optional().describe('Custom agent launch command if agentType is custom'),
};

export async function handleProvisionVps(args: z.infer<z.ZodObject<typeof provisionVpsSchema>>) {
  const envVars: Record<string, string> = {};
  if (args.geminiApiKey) envVars['GEMINI_API_KEY'] = args.geminiApiKey;
  if (args.anthropicApiKey) envVars['ANTHROPIC_API_KEY'] = args.anthropicApiKey;
  if (args.openaiApiKey) envVars['OPENAI_API_KEY'] = args.openaiApiKey;
  if (args.githubToken) envVars['GITHUB_TOKEN'] = args.githubToken;

  const credentials = {
    host: args.host,
    port: args.port,
    username: args.username,
    password: args.password,
    privateKey: args.privateKey,
    passphrase: args.passphrase,
  };

  const options: ProvisionOptions = {
    credentials,
    agent: {
      type: args.agentType as AgentType,
      envVars,
      customCommand: args.customCommand,
      gitConfig: {
        name: args.gitUserName,
        email: args.gitUserEmail,
        githubToken: args.githubToken,
      },
    },
    enableWebTerminal: args.enableWebTerminal,
    webTerminalPort: args.webTerminalPort,
  };

  if (args.telegramBotToken && args.telegramAdminChatId) {
    options.telegram = {
      enabled: true,
      botToken: args.telegramBotToken,
      adminChatId: args.telegramAdminChatId,
    };
  }

  const orchestrator = new ProvisionOrchestrator(credentials);

  try {
    await orchestrator.connect();
    const result = await orchestrator.provision(options);
    orchestrator.disconnect();

    if (!result.success) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `❌ Provisioning failed on ${args.host}: ${result.error}`,
          },
        ],
      };
    }

    const output = {
      message: `🎉 Successfully configured 24/7 ${args.agentType} on ${args.host}!`,
      host: args.host,
      duration: `${result.durationSeconds} seconds`,
      operatingSystem: result.systemInfo.os.name,
      agent: args.agentType,
      telegramConnected: result.telegramConnected,
      webTerminalUrl: result.webTerminalUrl || 'Disabled for security',
      stepsCompleted: result.stepsCompleted,
      nextSteps: [
        result.telegramConnected
          ? 'Open Telegram and send `/status` or `/help` to your bot.'
          : 'You can now execute tasks using the `execute_agent_task` tool or connect via SSH.',
        'The agent is running persistently under systemd (agentvps.service) with automatic crash restart.',
      ],
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(output, null, 2),
        },
      ],
    };
  } catch (error: any) {
    orchestrator.disconnect();
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: `Error provisioning VPS ${args.host}: ${error.message || String(error)}`,
        },
      ],
    };
  }
}
