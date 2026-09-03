import { z } from 'zod';
import { CloudProviderEngine, CloudProviderType } from '../../engine/cloud-providers.js';
import { AgentType } from '../../types/index.js';

export const createCloudVpsSchema = {
  provider: z
    .enum(['hetzner', 'digitalocean'])
    .describe('Cloud provider to provision on (hetzner: €3.79/mo, digitalocean: $12/mo)'),
  apiToken: z.string().describe('Your Cloud API token (Hetzner Cloud Token or DigitalOcean API Token)'),
  agentType: z
    .enum(['antigravity-cli', 'claude-code', 'aider', 'openhands', 'custom'])
    .default('antigravity-cli')
    .describe('AI agent to run on the newly created VPS'),
  serverName: z.string().optional().describe('Custom name for the cloud instance'),
  region: z.string().optional().describe('Datacenter region (e.g. fsn1/nbg1 for Hetzner, nyc3/fra1 for DigitalOcean)'),
  geminiApiKey: z.string().optional().describe('Google Gemini API Key'),
  anthropicApiKey: z.string().optional().describe('Anthropic Claude API Key'),
  openaiApiKey: z.string().optional().describe('OpenAI API Key'),
  githubToken: z.string().optional().describe('GitHub Personal Access Token'),
  telegramBotToken: z.string().optional().describe('Telegram Bot Token for 24/7 mobile control'),
  telegramAdminChatId: z.string().optional().describe('Telegram Admin Chat ID'),
};

export async function handleCreateCloudVps(args: z.infer<z.ZodObject<typeof createCloudVpsSchema>>) {
  const envVars: Record<string, string> = {};
  if (args.geminiApiKey) envVars['GEMINI_API_KEY'] = args.geminiApiKey;
  if (args.anthropicApiKey) envVars['ANTHROPIC_API_KEY'] = args.anthropicApiKey;
  if (args.openaiApiKey) envVars['OPENAI_API_KEY'] = args.openaiApiKey;
  if (args.githubToken) envVars['GITHUB_TOKEN'] = args.githubToken;

  const telegram =
    args.telegramBotToken && args.telegramAdminChatId
      ? {
          enabled: true,
          botToken: args.telegramBotToken,
          adminChatId: args.telegramAdminChatId,
        }
      : undefined;

  try {
    const result = await CloudProviderEngine.provision({
      provider: args.provider as CloudProviderType,
      apiToken: args.apiToken,
      name: args.serverName,
      region: args.region,
      agent: {
        type: args.agentType as AgentType,
        envVars,
      },
      telegram,
    });

    const report = {
      message: `🎉 Successfully initiated 1-click cloud VPS on ${args.provider.toUpperCase()}!`,
      provider: result.provider,
      serverId: result.serverId,
      serverName: result.serverName,
      publicIp: result.publicIp,
      region: result.region,
      agent: result.agent,
      status: result.status,
      telegramConnected: result.telegramConnected,
      note: 'The cloud instance is booting and executing cloud-init self-provisioning. It will be fully ready in ~45 seconds.',
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(report, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: `Failed to create cloud VPS on ${args.provider}: ${error.message || String(error)}`,
        },
      ],
    };
  }
}
